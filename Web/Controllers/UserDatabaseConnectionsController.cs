using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using QueryTree.Models;


namespace QueryTree.Controllers
{
    [Authorize]
    public class UserDatabaseConnectionsController : IdentityController
    {
		private IEmailSender _emailSender;
        private IWebHostEnvironment _env;
        private IConfiguration _config;
		
		public UserDatabaseConnectionsController(
            ApplicationDbContext dbContext,
            UserManager<ApplicationUser> userManager,
            IEmailSender emailSender,
            IConfiguration config,
            IWebHostEnvironment env)
            : base(userManager, dbContext)
		{
		    _emailSender = emailSender;
            _config = config;
            _env = env;
		}

        // Determines whether a user has access to a database connection
        private bool HasAccess(ApplicationUser currentUser, DatabaseConnection databaseConnection)
        {
            bool hasAccess = false;

            var userConnections = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id);
            
            if (userConnections.Any(uc => uc.DatabaseConnectionID == databaseConnection.DatabaseConnectionID))
            {
                hasAccess = true;
            }
            else if (databaseConnection.OrganisationId == currentUser.OrganisationId)
            {
                hasAccess = true;
            }

            return hasAccess;
        }

        // GET: UserDatabaseConnections/Create
        public ActionResult Create(int id)
        {
            var databaseConnection = db.DatabaseConnections.FirstOrDefault(d => d.DatabaseConnectionID == id);

            if (databaseConnection == null)
            {
                return NotFound();
            }

            bool hasAccess = HasAccess(CurrentUser, databaseConnection);

            if (hasAccess == false)
            {
                return NotFound();
            }

            ViewBag.types = new[] { UserDatabaseTypes.Admin, UserDatabaseTypes.ReportBuilder, UserDatabaseTypes.ReportViewer }.Select(e => new { Id = (int)e, Value = e.ToString() });

            return View(new UserDatabaseConnection() { DatabaseConnection = databaseConnection, DatabaseConnectionID = databaseConnection.DatabaseConnectionID, Type = UserDatabaseTypes.Admin });
        }

        // POST: UserDatabaseConnections/Create
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(UserDatabaseConnection userDatabaseConnection)
        {
            var id = _userManager.GetUserId(User);

            if (ModelState.IsValid)
            {
                var databaseConnection = db.DatabaseConnections.FirstOrDefault(dc => dc.DatabaseConnectionID == userDatabaseConnection.DatabaseConnectionID);

                if (databaseConnection == null)
                {
                    return NotFound();
                }

                bool hasAccess = HasAccess(CurrentUser, databaseConnection);

                if (hasAccess == false)
                {
                    return NotFound();
                }

                var lowercaseEmail = userDatabaseConnection.InviteEmail.ToLower();
                var invitedUser = db.ApplicationUsers.FirstOrDefault(u => u.Email.ToLower() == lowercaseEmail);
                
                if (invitedUser != null && db.UserDatabaseConnections.Any(u => u.DatabaseConnectionID == userDatabaseConnection.DatabaseConnectionID && u.ApplicationUserID == invitedUser.Id))
                {
                    ModelState.AddModelError("Error", "This User already has an access to this Database Connection");
                }
                else if (invitedUser != null && invitedUser.OrganisationId == userDatabaseConnection.DatabaseConnection.OrganisationId)
                {
                    ModelState.AddModelError("Error", "This User is already an Organisation Admin for this Database Connection");
                }
                else if (invitedUser != null && db.OrganisationInvites.Any(oi => oi.OrganisationId == userDatabaseConnection.DatabaseConnection.OrganisationId && oi.InviteEmail.ToLower() == lowercaseEmail && oi.AcceptedOn == null && oi.RejectedOn == null))
                {
                    ModelState.AddModelError("Error", "This User has already been invited to be an Organisation Admin for this Database Connection");
                }
                else
                { 
                    userDatabaseConnection.CreatedOn = DateTime.Now;
                    userDatabaseConnection.CreatedBy = CurrentUser;

                    if (invitedUser != null)
                    {
                        userDatabaseConnection.ApplicationUser = invitedUser;
                        userDatabaseConnection.InviteEmail = null;
                    }

                    db.UserDatabaseConnections.Add(userDatabaseConnection);
                    db.SaveChanges();

                    SendDatabaseInviteMail(userDatabaseConnection);

                    return RedirectToAction("Details", "Home", new { id = userDatabaseConnection.DatabaseConnectionID });
                } 
            }
            
            ViewBag.types = new[] { UserDatabaseTypes.Admin, UserDatabaseTypes.ReportBuilder, UserDatabaseTypes.ReportViewer }.Select(e => new { Id = (int)e, Value = e.ToString() });

            return View(userDatabaseConnection);
        }

		public void SendDatabaseInviteMail(UserDatabaseConnection userLink)
		{
			var email = new MimeMessage();
            email.From.Add(new MailboxAddress(UTF8Encoding.UTF8, "QueryTree", _config.GetValue<string>("Email:SenderAddress")));
			email.To.Add(new MailboxAddress(userLink.InviteEmail ?? userLink.ApplicationUser.Email));
			email.Subject = string.Format("You have been invited to use QueryTree by {0}", userLink.CreatedBy.Email);

            var webRoot = _env.ContentRootPath.TrimEnd('/') + '/';

			// load template
			string text, html;
			if (userLink.ApplicationUser != null)
			{
				text = System.IO.File.ReadAllText(Path.Combine(webRoot, @"EmailTemplates/InviteExistingUser.txt"));
				html = System.IO.File.ReadAllText(Path.Combine(webRoot, @"EmailTemplates/InviteExistingUser.html"));
			}
			else
			{
                text = System.IO.File.ReadAllText(Path.Combine(webRoot, @"EmailTemplates/InviteNewUser.txt"));
                html = System.IO.File.ReadAllText(Path.Combine(webRoot, @"EmailTemplates/InviteNewUser.html"));
			}

            // set up replacements
            var replacements = new Dictionary<string, string>
            {
                { "{sender}", userLink.CreatedBy.Email }
            };

            if (userLink.ApplicationUser != null)
			{
				replacements.Add("{url}", Url.Action("Details", "Home", new { id = userLink.DatabaseConnectionID }, Request.Scheme));
			}
			else
			{
				replacements.Add("{url}", Url.Action("Register", "Account", new { email = userLink.InviteEmail }, Request.Scheme));
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

        // GET: UserDatabaseConnections/Edit/5
        public ActionResult Edit(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var userDatabaseConnection = db.UserDatabaseConnections
                .Include(udc => udc.DatabaseConnection)
                .FirstOrDefault(udc => udc.UserDatabaseConnectionID == id);

            if (userDatabaseConnection == null)
            {
                return NotFound();
            }

            bool hasAccess = HasAccess(CurrentUser, userDatabaseConnection.DatabaseConnection);

            if (hasAccess == false)
            {
                return NotFound();
            }

            ViewBag.ApplicationUserID = new SelectList(db.ApplicationUsers, "Id", "Email", userDatabaseConnection.ApplicationUserID);
            ViewBag.DatabaseConnectionID = new SelectList(db.DatabaseConnections, "DatabaseConnectionID", "Name", userDatabaseConnection.DatabaseConnectionID);
            ViewBag.types = new[] { UserDatabaseTypes.Admin, UserDatabaseTypes.ReportBuilder, UserDatabaseTypes.ReportViewer }.Select(e => new { Id = (int)e, Value = e.ToString() });
            return View(userDatabaseConnection);
        }

        // POST: UserDatabaseConnections/Edit/5
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(UserDatabaseConnection userDatabaseConnection)
        {
            var existingUserDatabaseConnection = db.UserDatabaseConnections
                .Include(udc => udc.DatabaseConnection)
                .FirstOrDefault(udc => udc.UserDatabaseConnectionID == userDatabaseConnection.UserDatabaseConnectionID);

            if (existingUserDatabaseConnection == null)
            {
                return NotFound();
            }

            bool hasAccess = HasAccess(CurrentUser, existingUserDatabaseConnection.DatabaseConnection);

            if (hasAccess == false)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                existingUserDatabaseConnection.Type = userDatabaseConnection.Type;
                
                db.SaveChanges();

                return RedirectToAction("Details", "Home", new { id = existingUserDatabaseConnection.DatabaseConnectionID });
            }

            ViewBag.ApplicationUserID = new SelectList(db.ApplicationUsers, "Id", "Email", existingUserDatabaseConnection.ApplicationUserID);
            ViewBag.DatabaseConnectionID = new SelectList(db.DatabaseConnections, "DatabaseConnectionID", "Name", existingUserDatabaseConnection.DatabaseConnectionID);

            return View(userDatabaseConnection);
        }

        // GET: UserDatabaseConnections/Delete/5
        public ActionResult Delete(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var existingUserDatabaseConnection = db.UserDatabaseConnections
                .Include(udc => udc.DatabaseConnection)
                .FirstOrDefault(udc => udc.UserDatabaseConnectionID == id);

            if (existingUserDatabaseConnection == null)
            {
                return NotFound();
            }

            bool hasAccess = HasAccess(CurrentUser, existingUserDatabaseConnection.DatabaseConnection);

            if (hasAccess == false)
            {
                return NotFound();
            }

            return View(existingUserDatabaseConnection);
        }

        // POST: UserDatabaseConnections/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(int id)
        {
            var existingUserDatabaseConnection = db.UserDatabaseConnections
                .Include(udc => udc.DatabaseConnection)
                .FirstOrDefault(udc => udc.UserDatabaseConnectionID == id);

            if (existingUserDatabaseConnection == null)
            {
                return NotFound();
            }

            bool hasAccess = HasAccess(CurrentUser, existingUserDatabaseConnection.DatabaseConnection);

            if (hasAccess == false)
            {
                return NotFound();
            }

            int? dbId = existingUserDatabaseConnection.DatabaseConnectionID;
            
            db.UserDatabaseConnections.Remove(existingUserDatabaseConnection);
            
            db.SaveChanges();

            if (dbId.HasValue)
            {
                return RedirectToAction("Details", "Home", new { id = dbId });
            }
            else
            {
                return RedirectToAction("Index", "Home");
            }
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
