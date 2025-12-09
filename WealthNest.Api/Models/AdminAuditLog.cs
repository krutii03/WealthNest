using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WealthNest.Api.Models;

[Table("admin_audit_log")]
public class AdminAuditLog
{
    [Key]
    [Column("log_id")]
    public Guid LogId { get; set; } = Guid.NewGuid();

    [Column("admin_id")]
    public Guid? AdminId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("action")]
    public string Action { get; set; } = string.Empty;

    [Column("details")]
    public string? Details { get; set; }

    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [Column("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

