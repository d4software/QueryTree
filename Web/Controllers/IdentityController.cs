using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using QueryTree.Models;

namespace QueryTree.Controllers
{
    public class IdentityController : Controller
    {
        protected ApplicationDbContext db;
        protected UserManager<ApplicationUser> _userManager;
        private ApplicationUser _currentUser;

        public IdentityController(UserManager<ApplicationUser> userManager, ApplicationDbContext dbContext)
        {
            db = dbContext;
            _userManager = userManager;
        }

		public ApplicationUser CurrentUser
		{
			get
			{
                if (_currentUser == null)
                {
					string userId = _userManager.GetUserId(User);
					_currentUser = db.ApplicationUsers
                                        .Include(u => u.Organisation)
                                        .FirstOrDefault(u => u.Id == userId);
                }

                return _currentUser;
			}
		}
    }
}
