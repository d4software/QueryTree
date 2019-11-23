using System;
using System.Collections.Generic;
using System.Linq;
using QueryTree.Models;
using QueryTree.ViewModels;
using QueryTree.Managers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace QueryTree.Controllers
{
    [Authorize]
    public class InvitationsController : Controller
    {
		private UserManager<ApplicationUser> _userManager;
		private ApplicationDbContext db;

		public InvitationsController(
            ApplicationDbContext dbContext,
            UserManager<ApplicationUser> userManager)
		{
            db = dbContext;
			_userManager = userManager;
		}

		private ApplicationUser _currentUser;
		private ApplicationUser CurrentUser
		{
			get
			{
				if (_currentUser == null)
				{
					string userId = _userManager.GetUserId(User);
					_currentUser = db.ApplicationUsers.FirstOrDefault(u => u.Id == userId);
				}

				return _currentUser;
			}
		}

        public ActionResult Index()
        {
            if (CurrentUser == null)
            {
                return NotFound("Could not find user");
            }

            var invites = db.OrganisationInvites.Where(uc => uc.InviteEmail.ToLower() == CurrentUser.Email.ToLower() && uc.AcceptedOn == null && uc.RejectedOn == null);

            if (invites.Any() == false)
            {
                // No invites to look at, redirect to home
                return RedirectToAction("Index", "Home");
            }

            List<InvitationViewModel> viewModels = new List<InvitationViewModel>();

            foreach(var orgGrp in invites
                .Include(c => c.CreatedBy)
                .GroupBy(c => c.OrganisationId))
            {
                InvitationViewModel viewModel = new InvitationViewModel
                {
                    OrganisationInviteId = orgGrp.First().OrganisationInviteId
                };
                
                Organisation organisation = db.Organisations.First(ba => ba.OrganisationId == orgGrp.Key);
                viewModel.OrganisationId = organisation.OrganisationId;

                viewModel.Invitees = orgGrp
                    .Select(g => g.CreatedBy.UserName)
                    .OrderBy(_ => _)
                    .Distinct()
                    .ToList();
                
                viewModel.OrganisationName = organisation.OrganisationName;
                
                viewModels.Add(viewModel);
            }

            if (viewModels.Any())
            {
                List<string> databasesMerged = new List<string>();
                List<string> databasesLost = new List<string>();
                
                List<string> databases = db.DatabaseConnections
                    .Where(d => d.OrganisationId == CurrentUser.OrganisationId)
                    .ToList()
                    .Select(d => d.Name)
                    .OrderBy(d => d)
                    .ToList();

                // are the the sole owner of the organisation?
                // if so we should transfer databases to the new organisation
                bool soleOwner = db.ApplicationUsers.Any(u => u.OrganisationId == CurrentUser.OrganisationId && CurrentUser.Id != u.Id) == false;

                if (soleOwner)
                {
                    databasesMerged = databases;
                }
                else
                {
                    databasesLost = databases;
                }
                
                foreach(var viewModel in viewModels)
                {
                    viewModel.DatabasesMerged = databasesMerged;
                    viewModel.DatabasesLost = databasesLost;
                }
            }

            return View(viewModels);
        }

        public ActionResult Accept(int id)
        {
            if (CurrentUser == null)
            {
                return NotFound("Could not find user");
            }

            var invite = db.OrganisationInvites.FirstOrDefault(uc => uc.InviteEmail.ToLower() == CurrentUser.Email.ToLower() && uc.AcceptedOn == null && uc.RejectedOn == null && uc.OrganisationInviteId == id);

            if (invite == null)
            {
                return NotFound("Invite not found");
            }

            var organisation = db.Organisations.FirstOrDefault(ba => ba.OrganisationId == invite.OrganisationId);

            if (organisation == null)
            {
                return NotFound("Organisation not found");
            }

            List<DatabaseConnection> leave = new List<DatabaseConnection>();
            List<DatabaseConnection> migrate = new List<DatabaseConnection>();
            
            // Migrate or cut connections with databases as necessary.
            List<DatabaseConnection> databases = db.DatabaseConnections
                .Where(d => d.OrganisationId == CurrentUser.OrganisationId)
                .ToList()
                .ToList();

            // are the the sole owner of the organisation?
            // if so we should transfer databases to the new organisation
            bool soleOwner = db.ApplicationUsers.Any(u => u.OrganisationId == CurrentUser.OrganisationId && CurrentUser.Id != u.Id) == false;

            if (soleOwner)
            {
                migrate = databases;
            }
            else
            {
                leave = databases;
            }
            
            foreach(var database in leave)
            {
                // there shouldn't be any of these, but do it just in case
                db.UserDatabaseConnections.RemoveWhere(uc => uc.DatabaseConnectionID == database.DatabaseConnectionID && uc.ApplicationUserID == CurrentUser.Id);
            }

            foreach (var database in migrate)
            {
                // there shouldn't be any of these, but do it just in case
                db.UserDatabaseConnections.RemoveWhere(uc => uc.DatabaseConnectionID == database.DatabaseConnectionID && uc.ApplicationUserID == CurrentUser.Id);
                
                database.Organisation = organisation;
            }
            
            CurrentUser.OrganisationId = organisation.OrganisationId;

            invite.AcceptedOn = DateTime.Now;
            
            // reject other invitations to other organisations
            var invitesToReject = db.OrganisationInvites.Where(uc => uc.InviteEmail.ToLower() == CurrentUser.Email.ToLower() && uc.OrganisationInviteId != invite.OrganisationInviteId);
        
            foreach (var inviteToReject in invitesToReject)
            {
                inviteToReject.RejectedOn = DateTime.Now;
            }

            db.SaveChanges();

            return RedirectToAction("Index", "Home");
        }
        
        public ActionResult Reject(int id)
        {
            if (CurrentUser == null)
            {
                return NotFound("Could not find user");
            }
            
            var invite = db.OrganisationInvites.FirstOrDefault(uc => uc.InviteEmail.ToLower() == CurrentUser.Email.ToLower() && uc.AcceptedOn == null && uc.RejectedOn == null && uc.OrganisationInviteId == id);

            if (invite == null)
            {
                return NotFound("Invite not found");
            }

            invite.RejectedOn = DateTime.Now;

            db.SaveChanges();

            return RedirectToAction("Index", "Home");
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }

    }
}
