using System;
using System.Collections.Generic;
using System.Linq;
using Hangfire;
using Hangfire.Dashboard;
using Hangfire.SQLite;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using QueryTree.Models;
using QueryTree.Managers;
using QueryTree.Services;

namespace QueryTree
{
    public class Startup
    {        
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddSingleton<IConfiguration>(Configuration);

            services.Configure<CustomizationConfiguration>(Configuration.GetSection("Customization"));
            services.Configure<PasswordsConfiguration>(Configuration.GetSection("Passwords"));

            switch (Configuration.GetValue<Enums.DataStoreType>("Customization:DataStore"))
            {
                case Enums.DataStoreType.MSSqlServer:
                    services.AddDbContext<ApplicationDbContext>(options =>
                        options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")));
                    services.AddHangfire(x =>
                        x.UseSqlServerStorage(Configuration.GetConnectionString("DefaultConnection"))
                    );
                    break;

                default:
                    services.AddDbContext<ApplicationDbContext>(options =>
                        options.UseSqlite(Configuration.GetConnectionString("DefaultConnection")));
                    services.AddHangfire(x =>
                        x.UseSQLiteStorage(Configuration.GetConnectionString("DefaultConnection"))
                    );
                    break;
            }

            services.AddIdentity<ApplicationUser, IdentityRole>()
                .AddEntityFrameworkStores<ApplicationDbContext>()
                .AddDefaultTokenProviders();
            
            services.AddMvc();
            
            services.AddAuthentication()
                .AddCookie(options => 
                {                
                    // Cookie settings
                    options.ExpireTimeSpan = TimeSpan.FromDays(150);
                    options.LoginPath = "/Account/LogIn";
                    options.LogoutPath = "/Account/LogOut";                    
                });
           
            services.Configure<IdentityOptions>(options =>
            {
                // Password settings
                options.Password.RequiredLength = 8;
                
                // Lockout settings
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(30);
                options.Lockout.MaxFailedAccessAttempts = 10;

                // User settings
                options.User.RequireUniqueEmail = true;
            });

            // Add application services.
            services.AddTransient<IEmailSenderService, EmailSenderService>();
            services.AddTransient<IEmailSender, EmailSender>();
            services.AddTransient<IPasswordManager, PasswordManager>(); // Allows controllers to set/get/delete database credentials
            services.AddTransient<IScheduledEmailManager, ScheduledEmailManager>();
			services.AddMemoryCache();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env, ILoggerFactory loggerFactory)
        {
            loggerFactory.AddConsole(Configuration.GetSection("Logging"));
            loggerFactory.AddDebug();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseDatabaseErrorPage();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
            }

            app.UseStaticFiles();

            app.UseAuthentication();

            if (Configuration["RunHangfire"] == "true")
            {
                app.UseHangfireServer();

                var dashboardOptions = new DashboardOptions
                {
                    Authorization = new[] { new HangfireAuthorizationFilter() }
                };
                app.UseHangfireDashboard("/hangfire", dashboardOptions);
            }

            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller=Home}/{action=Index}/{id?}");
            });
               
            if (!String.IsNullOrWhiteSpace(Configuration.GetValue<string>("Customization:BaseUri"))) {
                app.Use((context, next) => {
                    context.Request.PathBase = new PathString(Configuration.GetValue<string>("Customization:BaseUri"));
                    return next();
                });
            }
        }
    }
}
