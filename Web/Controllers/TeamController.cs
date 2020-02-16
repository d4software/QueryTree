using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using QueryTree.Models;
using QueryTree.ViewModels;
using System.Threading.Tasks;
using QueryTree.Managers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using MailKit.Net.Smtp;
using MailKit;
using MimeKit;
using Microsoft.Extensions.Configuration;

namespace QueryTree.Controllers
{
    [Authorize]
    public class TeamController : IdentityController
    {
        private IEmailSender _emailSender;
        private IWebHostEnvironment _env;
        private IConfiguration _config;

		public TeamController(
            ApplicationDbContext dbContext,
            IEmailSender emailSender,
            IWebHostEnvironment env,
            IConfiguration config,
            UserManager<ApplicationUser> userManager)
            : base(userManager, dbContext)
		{
            _env = env;
            _config = config;
            _emailSender = emailSender;
		}

        public ActionResult Index()
        {
            // Find all users with access to databases that use this organisation
            var userPermissionGrps = db.DatabaseConnections
                .Where(d => d.OrganisationId == CurrentUser.OrganisationId)
                .Join(db.UserDatabaseConnections, d => d.DatabaseConnectionID, uc => uc.DatabaseConnectionID, (db, uc) => uc)
                .Select(uc => new {
                    ApplicationUserID = uc.ApplicationUserID,
                    Email = uc.ApplicationUser != null ? uc.ApplicationUser.Email : uc.InviteEmail,
                    Type = uc.Type,
                    DatabaseConnectionID = uc.DatabaseConnectionID,
                })
                .ToLookup(_ => _.Email);

            List<PermissionViewModel> viewModels = new List<PermissionViewModel>();

            Dictionary<int, string> databaseNames = new Dictionary<int, string>();

            foreach (var userPermissionGrp in userPermissionGrps)
            {
                PermissionViewModel viewModel = new PermissionViewModel
                {
                    ApplicationUserID = userPermissionGrp.First().ApplicationUserID,
                    Email = userPermissionGrp.Key,
                    IsOrganisationAdmin = false,
                    DatabasePermissions = new List<PermissionViewModel.DatabasePermission>()
                };

                foreach (var permission in userPermissionGrp)
                {
                    if (databaseNames.ContainsKey(permission.DatabaseConnectionID) == false)
                    {
                        databaseNames.Add(permission.DatabaseConnectionID, db.DatabaseConnections.Find(permission.DatabaseConnectionID).Name);
                    }

                    viewModel.DatabasePermissions.Add(new PermissionViewModel.DatabasePermission
                    {
                        DatabaseId = permission.DatabaseConnectionID,
                        DatabaseName = databaseNames[permission.DatabaseConnectionID],
                        AccessType = permission.Type.ToString()
                    });
                }

                viewModel.DatabasePermissions = viewModel.DatabasePermissions.OrderBy(p => p.DatabaseName).ToList();
                
                viewModels.Add(viewModel);
            }

            // Find other users that share this organisation
            var orgUsers = db.ApplicationUsers
                .Where(u => u.OrganisationId == CurrentUser.OrganisationId && u.Id != CurrentUser.Id)
                .ToList();

            foreach (var orgUser in orgUsers)
            {
                if (userPermissionGrps.Contains(orgUser.Id) == false)
                {
                    viewModels.Add(new PermissionViewModel
                    {
                        ApplicationUserID = orgUser.Id,
                        Email = orgUser.Email,
                        IsOrganisationAdmin = true,
                        DatabasePermissions = new List<PermissionViewModel.DatabasePermission>()
                    });
                }
            }

            var orgAdminInvites = db.OrganisationInvites.Where(oi => oi.OrganisationId == CurrentUser.OrganisationId && oi.AcceptedOn == null && oi.RejectedOn == null);

            foreach (var orgAdminInvite in orgAdminInvites)
            {
                viewModels.Add(new PermissionViewModel
                {
                    ApplicationUserID = null,
                    Email = orgAdminInvite.InviteEmail,
                    IsOrganisationAdmin = true,
                    DatabasePermissions = new List<PermissionViewModel.DatabasePermission>()
                });
            }

            viewModels = viewModels
                .OrderByDescending(v => v.IsOrganisationAdmin)
                .ThenBy(v => v.Email)
                .ToList();

            return View(viewModels);
        }
        
        // GET: Team/Invite
        public ActionResult Invite()
        {
            if (CurrentUser == null)
            {
                return NotFound("Could not find user");
            }

            PermissionViewModel viewModel = new PermissionViewModel
            {
                IsOrganisationAdmin = true,
                DatabasePermissions = new List<PermissionViewModel.DatabasePermission>()
            };

            db.Entry(CurrentUser).Reference(u => u.Organisation).Load();

            viewModel.OrganisationName = CurrentUser.Organisation.OrganisationName;
            viewModel.OrganisationDatabaseCount = db.DatabaseConnections.Count(dc => dc.OrganisationId == CurrentUser.OrganisationId);
            
            List<DatabaseConnection> databases = new List<DatabaseConnection>();
            
            databases = db.DatabaseConnections.Where(d => d.OrganisationId == CurrentUser.OrganisationId).ToList();
        
            foreach (var database in databases)
            {
                viewModel.DatabasePermissions.Add(new PermissionViewModel.DatabasePermission
                {
                    DatabaseId = database.DatabaseConnectionID,
                    DatabaseName = database.Name,
                    AccessType = "None",
                });
            }
            
            return View(viewModel);
        }

        [HttpPost]
        public ActionResult Invite(PermissionViewModel viewModel)
        {
            if (viewModel.DatabasePermissions == null)
            {
                viewModel.DatabasePermissions = new List<PermissionViewModel.DatabasePermission>();
            }

            if (CurrentUser == null)
            {
                return NotFound("Could not find user");
            }

            if (string.Compare(CurrentUser.Email, viewModel.Email, true) == 0)
            {
                ModelState.AddModelError("invited-self", "You can't invite yourself.");
                return View(viewModel);
            }

            if (viewModel.DatabasePermissions == null)
            {
                viewModel.DatabasePermissions = new List<PermissionViewModel.DatabasePermission>();
            }

            if (viewModel.IsOrganisationAdmin == false && viewModel.DatabasePermissions.Any(d => d.AccessType != "None") == false)
            {
                ModelState.AddModelError("no-databases", "You must give the user access to at least one database.");
                return View(viewModel);
            }

            var organisation = db.Organisations.FirstOrDefault(ba => ba.OrganisationId == CurrentUser.OrganisationId);

            if (db.ApplicationUsers.Any(u => u.Email.ToLower() == viewModel.Email.ToLower() && u.OrganisationId == CurrentUser.OrganisationId))
            {
                ModelState.AddModelError("already-a-member", "That user is already a member of your team.");
                return View(viewModel);
            }

            var targettedUser = db.ApplicationUsers.FirstOrDefault(u => string.Compare(u.Email, viewModel.Email, true) == 0);

            if (viewModel.IsOrganisationAdmin)
            {
                db.OrganisationInvites.Add(new OrganisationInvite()
                {
                    InviteEmail = viewModel.Email,
                    OrganisationId = CurrentUser.OrganisationId,
                    CreatedOn = DateTime.Now,
                    CreatedBy = CurrentUser
                });

                organisation.OrganisationName = viewModel.OrganisationName;
            }
            else
            {
                foreach (var databasePermission in viewModel.DatabasePermissions.Where(uc => uc.AccessType != "None"))
                {
                    var targettedUserId = targettedUser != null ? targettedUser.Id : null;

                    // Remove any previous access rows for this database
                    var previousPermissions = db.UserDatabaseConnections.Where(uc => uc.DatabaseConnectionID == databasePermission.DatabaseId && (uc.ApplicationUserID == targettedUserId || uc.InviteEmail.ToLower() == viewModel.Email));

                    if (previousPermissions.Any())
                    {
                        db.UserDatabaseConnections.RemoveRange(previousPermissions);
                    }

                    UserDatabaseTypes accessType;
                    if (Enum.TryParse(databasePermission.AccessType, out accessType))
                    {
                        var connection = new UserDatabaseConnection
                        {
                            CreatedBy = CurrentUser,
                            CreatedOn = DateTime.Now,
                            DatabaseConnectionID = databasePermission.DatabaseId,
                            Type = accessType
                        };

                        if (targettedUser != null)
                        {
                            connection.ApplicationUser = targettedUser;
                        }
                        else
                        {
                            connection.InviteEmail = viewModel.Email;
                        }

                        db.UserDatabaseConnections.Add(connection);
                    }
                }
            }
            db.SaveChanges();

            SendOrganisationInviteEmail(CurrentUser.Email, viewModel.Email, targettedUser != null);

            return RedirectToAction("Index", "Team");
        }

        // GET: Team/Edit
        public ActionResult Edit(string id)
        {
            if (CurrentUser == null)
            {
                return NotFound("Could not find user");
            }

            var user = db.ApplicationUsers.FirstOrDefault(u => u.Id == id);

            if (user == null)
            {
                return NotFound("Could not find user");
            }

            List<DatabaseConnection> databases = db.DatabaseConnections.Where(d => d.OrganisationId == CurrentUser.OrganisationId).ToList();

            PermissionViewModel viewModel = new PermissionViewModel
            {
                ApplicationUserID = user.Id,
                Email = user.Email,
                OrganisationName = CurrentUser.Organisation.OrganisationName,
                IsOrganisationAdmin = user.OrganisationId == CurrentUser.OrganisationId,
                DatabasePermissions = new List<PermissionViewModel.DatabasePermission>()
            };

            foreach (var database in databases)
            {
                var viewPermission = new PermissionViewModel.DatabasePermission
                {
                    DatabaseId = database.DatabaseConnectionID,
                    DatabaseName = database.Name,
                    AccessType = "None",
                };

                var permission = db.UserDatabaseConnections.FirstOrDefault(uc => uc.ApplicationUserID == user.Id && uc.DatabaseConnectionID == database.DatabaseConnectionID);
                if (permission != null)
                {
                    viewPermission.AccessType = permission.Type.ToString();
                }

                viewModel.DatabasePermissions.Add(viewPermission);
            }

            viewModel.OrganisationDatabaseCount = db.DatabaseConnections.Count(dc => dc.OrganisationId == CurrentUser.OrganisationId);

            return View(viewModel);
        }

        [HttpPost]
        public ActionResult Edit(PermissionViewModel viewModel)
        {
            if (CurrentUser == null)
            {
                return NotFound("Could not find user");
            }

            var user = db.ApplicationUsers.FirstOrDefault(u => u.Id == viewModel.ApplicationUserID);

            if (user == null)
            {
                return NotFound("Could not find user");
            }

            if (viewModel.DatabasePermissions == null)
            {
                viewModel.DatabasePermissions = new List<PermissionViewModel.DatabasePermission>();
            }
            
            var currentConnections = db.UserDatabaseConnections.Where(uc => uc.ApplicationUserID == user.Id).ToList();
            
            if (viewModel.IsOrganisationAdmin)
            {
                // Remove any DB specific permissions
                db.UserDatabaseConnections.RemoveWhere(uc => uc.ApplicationUserID == user.Id && uc.DatabaseConnection.OrganisationId == CurrentUser.OrganisationId);

                // Create an Org Admin invite
                db.OrganisationInvites.Add(new OrganisationInvite()
                {
                    InviteEmail = user.Email,
                    OrganisationId = CurrentUser.OrganisationId,
                    CreatedOn = DateTime.Now,
                    CreatedBy = CurrentUser
                });
            }
            else
            {
                // modify/remove existing permissions as necessary
                foreach(var connection in currentConnections)
                {
                    UserDatabaseTypes accessType;

                    var databasePermission = viewModel.DatabasePermissions.FirstOrDefault(p => p.DatabaseId == connection.DatabaseConnectionID);
                    if (databasePermission == null || databasePermission.AccessType == "None")
                    {
                        db.UserDatabaseConnections.Remove(connection);
                    }
                    else if (Enum.TryParse(databasePermission.AccessType, out accessType) && accessType != connection.Type)
                    {
                        connection.Type = accessType;
                    }
                }

                var newPermissions = viewModel.DatabasePermissions
                    .Where(p => p.AccessType != "None" && currentConnections.Any(uc => uc.DatabaseConnectionID == p.DatabaseId) == false);

                foreach (var databasePermission in newPermissions)
                {
                    UserDatabaseTypes accessType;
                    if (Enum.TryParse(databasePermission.AccessType, out accessType))
                    {
                        db.UserDatabaseConnections.Add(new UserDatabaseConnection
                        {
                            ApplicationUser = user,
                            CreatedBy = CurrentUser,
                            CreatedOn = DateTime.Now,
                            DatabaseConnectionID = databasePermission.DatabaseId,
                            Type = accessType
                        });
                    }
                }
            }
            db.SaveChanges();

            return RedirectToAction("Index", "Team");
        }

        // GET: DatabaseConnections/Delete/5
        public ActionResult Remove(string email)
        {
            if (string.IsNullOrEmpty(email))
            {
                return BadRequest();
            }
            
            if (CurrentUser == null)
            {
                return NotFound("Could not find user");
            }

            var user = db.ApplicationUsers.FirstOrDefault(u => string.Compare(u.Email, email, true) == 0);
            var invite = db.OrganisationInvites.FirstOrDefault(oi => oi.InviteEmail == email && oi.AcceptedOn == null && oi.RejectedOn == null);
            var dbInvite = db.UserDatabaseConnections.FirstOrDefault(uc => uc.ApplicationUserID == null && uc.DatabaseConnection.OrganisationId == CurrentUser.OrganisationId && uc.InviteEmail == email);

            if (user == null && invite == null && dbInvite == null)
            {
                return NotFound("Could not find user");
            }

            ViewBag.Email = email;
            
            return View();
        }

        // GET: DatabaseConnections/RemoveConfirmation/5
        public ActionResult RemoveConfirmation(string email)
        {
            if (string.IsNullOrEmpty(email))
            {
                return BadRequest();
            }

            if (CurrentUser == null)
            {
                return NotFound("Could not find user");
            }

            var user = db.ApplicationUsers.FirstOrDefault(u => string.Compare(u.Email, email, true) == 0);
            if (user != null)
            {
                if (user.OrganisationId == CurrentUser.OrganisationId)
                {
                    // Take this user off our organisation, and give them a new one

                    var organisation = new Organisation
                    {
                        CreatedOn = DateTime.Now
                    };

                    db.Organisations.Add(organisation);
                    db.SaveChanges();

                    user.OrganisationId = organisation.OrganisationId;
                }

                var dbPermissions = db.UserDatabaseConnections.Where(uc => uc.ApplicationUserID == user.Id && uc.DatabaseConnection.OrganisationId == CurrentUser.OrganisationId);
                if (dbPermissions.Any())
                {
                    db.UserDatabaseConnections.RemoveRange(dbPermissions);
                }
            }

            var invites = db.OrganisationInvites.Where(oi => oi.InviteEmail == email && oi.AcceptedOn == null && oi.RejectedOn == null && oi.OrganisationId == CurrentUser.OrganisationId);
            if (invites.Any())
            {
                db.OrganisationInvites.RemoveRange(invites);
            }

            var dbInvites = db.UserDatabaseConnections.Where(uc => uc.ApplicationUserID == null && uc.DatabaseConnection.OrganisationId == CurrentUser.OrganisationId && uc.InviteEmail == email);
            if (dbInvites.Any())
            {
                db.UserDatabaseConnections.RemoveRange(dbInvites);
            }

            db.SaveChanges();

            return RedirectToAction("Index");
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }

		public void SendOrganisationInviteEmail(string fromEmail, string inviteEmail, bool inviteeAlreadyRegistered)
		{
			var email = new MimeMessage();
            email.From.Add(new MailboxAddress("QueryTree", _config.GetValue<string>("Email:SenderAddress")));
			email.To.Add(new MailboxAddress(inviteEmail));
			email.Subject = string.Format("You have been invited to use QueryTree by {0}", fromEmail);

            var templatePath = _env.ContentRootPath.TrimEnd('/') + '/';

			// load template
			string text, html;
			if (inviteeAlreadyRegistered)
			{
				text = System.IO.File.ReadAllText(System.IO.Path.Combine(templatePath, @"EmailTemplates/InviteExistingOrganisationUser.txt"));
				html = System.IO.File.ReadAllText(System.IO.Path.Combine(templatePath, @"EmailTemplates/InviteExistingOrganisationUser.html"));
			}
			else
			{
				text = System.IO.File.ReadAllText(System.IO.Path.Combine(templatePath, @"EmailTemplates/InviteNewOrganisationUser.txt"));
				html = System.IO.File.ReadAllText(System.IO.Path.Combine(templatePath, @"EmailTemplates/InviteNewOrganisationUser.html"));
			}

			// set up replacements
			var replacements = new Dictionary<string, string>();

			replacements.Add("{sender}", fromEmail);

			if (inviteeAlreadyRegistered)
			{
				replacements.Add("{url}", Url.Action("Index", "Invitations", new { }, Request.Scheme));
			}
			else
			{
				replacements.Add("{url}", Url.Action("Register", "Account", new { email = inviteEmail }, Request.Scheme));
			}

			// do replacement
			foreach (var key in replacements.Keys)
			{
				text = text.Replace(key, replacements[key]);
				html = html.Replace(key, replacements[key]);
			}

			email.Body = new TextPart("html") { Text = html };

			_emailSender.SendMail(email);
		}
    }
}
