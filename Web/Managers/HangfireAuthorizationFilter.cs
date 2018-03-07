using Hangfire;
using Hangfire.Dashboard;
using System.Security.Claims;

namespace QueryTree
{
    public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
    {
        public bool Authorize(DashboardContext context)
        {
            var httpContext = context.GetHttpContext();
            if (httpContext.User.HasClaim(ClaimTypes.Role,"Admin"))
            {
                return true;
            }

            return false;
        }
    }
}