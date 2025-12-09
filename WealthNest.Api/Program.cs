using Microsoft.EntityFrameworkCore;
using Serilog;
using WealthNest.Api.Data;
using WealthNest.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AdminDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add services
builder.Services.AddScoped<ReconciliationService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowExpress", policy =>
    {
        policy.WithOrigins("http://localhost:3001")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowExpress");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "WealthNest Admin Reconciliation Module" }));

// Run on port 5001 to match Express configuration
app.Run("http://localhost:5001");
