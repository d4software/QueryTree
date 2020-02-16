using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using QueryTree.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace QueryTree
{
	public class Program
	{
		public static void Main(string[] args)
        {
            var host = GetBuilder(args, true)
                .Build();
            
            using (var scope = host.Services.CreateScope())
            {
                var context = scope.ServiceProvider.GetService<ApplicationDbContext>();
                context.Database.Migrate();
            }

            host.Run();
        }
		
		public static IWebHost BuildWebHost(string[] args)
        {
            return GetBuilder(args, false).Build();
        }

		public static IWebHostBuilder GetBuilder(string[] args, bool runHangfire)
        {
            var builder = WebHost.CreateDefaultBuilder(args)
                .UseStartup<Startup>();

            if (runHangfire)
            {
                builder = builder.UseSetting("RunHangfire", "true");
            }
            else
            {
                builder = builder.UseSetting("RunHangfire", "false");
            }

            return builder.ConfigureAppConfiguration((hostContext, config) =>
                {
                    if (hostContext.HostingEnvironment.IsDevelopment())
                    {
                        config.AddJsonFile($"usersettings.json", optional: true);
                    }
                });
        }
	}
}