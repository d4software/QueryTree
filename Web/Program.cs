using Google.Protobuf.WellKnownTypes;
using Hangfire;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using QueryTree.Managers;
using QueryTree.Models;
using QueryTree.Services;
using QueryTree;
using System;
using System.Configuration;
using Hangfire.SQLite;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IConfiguration>(builder.Configuration);

builder.Services.Configure<CustomizationConfiguration>(builder.Configuration.GetSection("Customization"));
builder.Services.Configure<PasswordsConfiguration>(builder.Configuration.GetSection("Passwords"));

switch (builder.Configuration.GetValue<QueryTree.Enums.DataStoreType>("Customization:DataStore"))
{
    case QueryTree.Enums.DataStoreType.MSSqlServer:
        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
        builder.Services.AddHangfire(x =>
            x.UseSqlServerStorage(builder.Configuration.GetConnectionString("DefaultConnection"))
        );
        break;

    default:
        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
        builder.Services.AddHangfire(x =>
            x.UseSQLiteStorage(builder.Configuration.GetConnectionString("DefaultConnection"))
        );
        break;
}

builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication()
                .AddCookie(options =>
                {
                    // Cookie settings
                    options.ExpireTimeSpan = TimeSpan.FromDays(150);
                    options.LoginPath = "/Account/LogIn";
                    options.LogoutPath = "/Account/LogOut";
                });

builder.Services.Configure<IdentityOptions>(options =>
{
    // Password settings
    options.Password.RequiredLength = 8;

    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(30);
    options.Lockout.MaxFailedAccessAttempts = 10;

    // User settings
    options.User.RequireUniqueEmail = true;
});
// Add services to the container.
builder.Services.AddControllersWithViews();

// Add application services.
builder.Services.AddTransient<IEmailSenderService, EmailSenderService>();
builder.Services.AddTransient<IEmailSender, EmailSender>();
builder.Services.AddTransient<IPasswordManager, PasswordManager>(); // Allows controllers to set/get/delete database credentials
builder.Services.AddTransient<IScheduledEmailManager, ScheduledEmailManager>();
builder.Services.AddMemoryCache();
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetService<ApplicationDbContext>();
    context.Database.Migrate();
}
// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
if (builder.Configuration["RunHangfire"] == "true")
{
    app.UseHangfireServer();

    var dashboardOptions = new DashboardOptions
    {
        Authorization = new[] { new HangfireAuthorizationFilter() }
    };
    app.UseHangfireDashboard("/hangfire", dashboardOptions);
}
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
if (!String.IsNullOrWhiteSpace(builder.Configuration.GetValue<string>("Customization:BaseUri")))
{
    app.Use((context, next) => {
        context.Request.PathBase = new PathString(builder.Configuration.GetValue<string>("Customization:BaseUri"));
        return next();
    });
}
app.Run();
