using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WealthNest.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialAdminAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "admin_audit_log",
                columns: table => new
                {
                    log_id = table.Column<Guid>(type: "uuid", nullable: false),
                    admin_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    details = table.Column<string>(type: "text", nullable: true),
                    ip_address = table.Column<string>(type: "text", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_audit_log", x => x.log_id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_log_action",
                table: "admin_audit_log",
                column: "action");

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_log_admin_id",
                table: "admin_audit_log",
                column: "admin_id");

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_log_timestamp",
                table: "admin_audit_log",
                column: "timestamp");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_audit_log");
        }
    }
}
