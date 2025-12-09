using Microsoft.EntityFrameworkCore;
using WealthNest.Api.Models;

namespace WealthNest.Api.Data;

public class AdminDbContext : DbContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options)
    {
    }

    public DbSet<AdminAuditLog> AdminAuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AdminAuditLog>(entity =>
        {
            entity.HasKey(e => e.LogId);
            entity.HasIndex(e => e.AdminId);
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => e.Action);
        });
    }
}

