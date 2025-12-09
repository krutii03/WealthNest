using Microsoft.AspNetCore.Mvc;
using WealthNest.Api.Services;

namespace WealthNest.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly ReconciliationService _reconciliationService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(ReconciliationService reconciliationService, ILogger<AdminController> logger)
    {
        _reconciliationService = reconciliationService;
        _logger = logger;
    }

    [HttpPost("reconcile")]
    public async Task<IActionResult> Reconcile([FromBody] ReconcileRequest request)
    {
        try
        {
            var from = request.From ?? DateTime.UtcNow.AddDays(-30);
            var to = request.To ?? DateTime.UtcNow;

            var result = await _reconciliationService.ReconcileAsync(from, to);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during reconciliation");
            return StatusCode(500, new { error = "Reconciliation failed", message = ex.Message });
        }
    }

    [HttpPost("audit/write")]
    public async Task<IActionResult> WriteAuditLog([FromBody] AuditWriteRequest request)
    {
        try
        {
            var details = request.Details != null 
                ? System.Text.Json.JsonSerializer.Serialize(request.Details)
                : string.Empty;

            await _reconciliationService.WriteAuditLogAsync(
                request.AdminId,
                request.Action,
                details,
                request.Ip,
                request.UserAgent
            );

            return Ok(new { message = "Audit log written successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error writing audit log");
            return StatusCode(500, new { error = "Failed to write audit log", message = ex.Message });
        }
    }
}

public class ReconcileRequest
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}

public class AuditWriteRequest
{
    public Guid? AdminId { get; set; }
    public string Action { get; set; } = string.Empty;
    public object? Details { get; set; }
    public string? Ip { get; set; }
    public string? UserAgent { get; set; }
}

