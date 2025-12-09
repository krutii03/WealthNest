using Microsoft.EntityFrameworkCore;
using WealthNest.Api.Data;
using WealthNest.Api.Models;
using Npgsql;

namespace WealthNest.Api.Services;

public class ReconciliationService
{
    private readonly AdminDbContext _context;
    private readonly ILogger<ReconciliationService> _logger;
    private readonly string _connectionString;

    public ReconciliationService(AdminDbContext context, ILogger<ReconciliationService> logger, IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _connectionString = configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Connection string not found");
    }

    public async Task<ReconciliationResult> ReconcileAsync(DateTime from, DateTime to)
    {
        _logger.LogInformation("Starting reconciliation from {From} to {To}", from, to);

        var result = new ReconciliationResult
        {
            From = from,
            To = to,
            Timestamp = DateTime.UtcNow,
            Discrepancies = new List<Discrepancy>(),
            SuggestedAdjustments = new List<Adjustment>(),
        };

        try
        {
            // Use EF Core's database connection (already configured and pooled)
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            // 1. Get total wallet balances
            await using var walletCmd = connection.CreateCommand();
            walletCmd.CommandText = "SELECT COALESCE(SUM(balance::numeric), 0) FROM wallets";
            var totalWalletBalance = Convert.ToDecimal(await walletCmd.ExecuteScalarAsync() ?? 0m);

            // 2. Get wallet count
            await using var walletCountCmd = connection.CreateCommand();
            walletCountCmd.CommandText = "SELECT COUNT(*) FROM wallets";
            var walletCount = Convert.ToInt32(await walletCountCmd.ExecuteScalarAsync() ?? 0);

            // 3. Get transactions in date range - use parameterized query
            await using var txCmd = connection.CreateCommand();
            txCmd.CommandText = @"
                SELECT 
                    transaction_type,
                    status,
                    COALESCE(SUM(amount::numeric), 0) as total_amount,
                    COUNT(*) as count
                FROM transactions
                WHERE created_at >= @p0 AND created_at <= @p1
                GROUP BY transaction_type, status";
            
            // Add parameters
            var fromParam = txCmd.CreateParameter();
            fromParam.ParameterName = "p0";
            fromParam.Value = from;
            txCmd.Parameters.Add(fromParam);
            
            var toParam = txCmd.CreateParameter();
            toParam.ParameterName = "p1";
            toParam.Value = to;
            txCmd.Parameters.Add(toParam);

            var transactionSummary = new TransactionSummary
            {
                TotalTransactions = 0,
                TotalDeposits = 0,
                TotalWithdrawals = 0,
                TotalBuys = 0,
                TotalSells = 0,
                Completed = 0,
                Pending = 0,
                Failed = 0,
            };

            await using var txReader = await txCmd.ExecuteReaderAsync();
            while (await txReader.ReadAsync())
            {
                var txType = txReader.GetString(0);
                var status = txReader.GetString(1);
                var amount = txReader.GetDecimal(2);
                var count = txReader.GetInt32(3);

                transactionSummary.TotalTransactions += count;

                if (status == "completed")
                {
                    transactionSummary.Completed += count;
                    if (txType == "deposit") transactionSummary.TotalDeposits += amount;
                    if (txType == "withdraw") transactionSummary.TotalWithdrawals += amount;
                    if (txType == "buy") transactionSummary.TotalBuys += amount;
                    if (txType == "sell") transactionSummary.TotalSells += amount;
                }
                else if (status == "pending")
                {
                    transactionSummary.Pending += count;
                }
                else if (status == "failed")
                {
                    transactionSummary.Failed += count;
                }
            }
            await txReader.CloseAsync();

            // 4. Calculate net flow
            transactionSummary.NetFlow = transactionSummary.TotalDeposits - transactionSummary.TotalWithdrawals;

            // 5. Check for discrepancies
            // Simple check: Compare expected vs actual
            var expectedSystemFunds = totalWalletBalance;
            var actualSystemFunds = totalWalletBalance; // In real implementation, compare with system_financials table

            // Add wallet and transaction summary to result
            result.WalletSummary = new WalletSummary
            {
                TotalWallets = walletCount,
                TotalBalance = totalWalletBalance,
                SystemFunds = actualSystemFunds
            };

            result.TransactionSummary = transactionSummary;

            // Check for basic discrepancies
            if (transactionSummary.Pending > 0)
            {
                result.Discrepancies.Add(new Discrepancy
                {
                    Type = "Pending Transactions",
                    Amount = 0,
                    Description = $"{transactionSummary.Pending} pending transactions may affect balance accuracy"
                });
            }

            if (transactionSummary.Failed > 0)
            {
                result.Discrepancies.Add(new Discrepancy
                {
                    Type = "Failed Transactions",
                    Amount = 0,
                    Description = $"{transactionSummary.Failed} failed transactions detected"
                });
            }

            result.Status = result.Discrepancies.Count > 0 ? "discrepancy" : "balanced";

            _logger.LogInformation("Reconciliation completed. Found {Count} discrepancies", result.Discrepancies.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during reconciliation");
            throw;
        }

        return result;
    }

    public async Task WriteAuditLogAsync(Guid? adminId, string action, string details, string? ipAddress, string? userAgent)
    {
        try
        {
            var log = new AdminAuditLog
            {
                AdminId = adminId,
                Action = action,
                Details = details,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Timestamp = DateTime.UtcNow,
            };

            _context.AdminAuditLogs.Add(log);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Audit log written: {Action} by admin {AdminId}", action, adminId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write audit log");
            throw;
        }
    }
}

public class ReconciliationResult
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public DateTime Timestamp { get; set; }
    public WalletSummary? WalletSummary { get; set; }
    public TransactionSummary? TransactionSummary { get; set; }
    public List<Discrepancy> Discrepancies { get; set; } = new();
    public List<Adjustment> SuggestedAdjustments { get; set; } = new();
    public string Status { get; set; } = "balanced";
}

public class WalletSummary
{
    public int TotalWallets { get; set; }
    public decimal TotalBalance { get; set; }
    public decimal SystemFunds { get; set; }
}

public class TransactionSummary
{
    public int TotalTransactions { get; set; }
    public decimal TotalDeposits { get; set; }
    public decimal TotalWithdrawals { get; set; }
    public decimal TotalBuys { get; set; }
    public decimal TotalSells { get; set; }
    public int Completed { get; set; }
    public int Pending { get; set; }
    public int Failed { get; set; }
    public decimal NetFlow { get; set; }
}

public class Discrepancy
{
    public string Type { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class Adjustment
{
    public string Type { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
}

