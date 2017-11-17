using System;
using System.Linq;
using QueryTree.Models;
using QueryTree.Managers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

namespace QueryTree.Controllers
{
    [Authorize]
    public class SimpleController : IdentityController
    {
		public SimpleController(
            ApplicationDbContext dbContext,
            UserManager<ApplicationUser> userManager)
            : base(userManager, dbContext)
		{
		}

        // GET: Queries/Create
        public ActionResult Create(int connectionId)
        {
            var database = db.DatabaseConnections.FirstOrDefault(dc => dc.DatabaseConnectionID == connectionId);

            if (database == null)
            {
                return NotFound();
            }

            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();
            
            if (PermissionMgr.UserCanModifyQuery(userPermissions, database) == false && database.OrganisationId != CurrentUser.OrganisationId)
            {
                return NotFound();
            }

            ViewBag.DatabaseConnectionID = connectionId;
            ViewBag.DatabaseName = database.Name;

            int i = 1;
            Query viewModel = new Query
            {
                DatabaseConnectionID = connectionId,
                Name = "Report " + i++
            };

            var existingQueries = db.Queries.Where(q => q.DatabaseConnectionID == connectionId).ToList();

            while (existingQueries.Any(q => string.Compare(q.Name, viewModel.Name, true) == 0))
            {
                viewModel.Name = "Report " + i++;
            }

            return View(viewModel);
        }

        // POST: Simple/Create
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(Query query)
        {
            var database = db.DatabaseConnections.FirstOrDefault(dc => dc.DatabaseConnectionID == query.DatabaseConnectionID);

            if (database == null)
            {
                return NotFound();
            }

            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();
            
            if (PermissionMgr.UserCanModifyQuery(userPermissions, database) == false && database.OrganisationId != CurrentUser.OrganisationId)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                db.Queries.Add(query);
                query.CreatedBy = CurrentUser;
                query.LastEditedBy = CurrentUser;
                query.CreatedOn = DateTime.Now;
                query.LastEditedOn = DateTime.Now;
                query.IsSimpleQuery = true;
                db.SaveChanges();

                return RedirectToAction("Details", "Queries", new { id = query.QueryID });
            }

            ViewBag.DatabaseConnectionID = database.DatabaseConnectionID;
            ViewBag.DatabaseName = database.Name;

            return View(query);
        }

        // GET: Simple/Edit/5
        public ActionResult Edit(int id)
        {
            Query query = db.Queries.Find(id);

            if (query == null || query.IsSimpleQuery == false)
            {
                return NotFound();
            }

            var database = db.DatabaseConnections.FirstOrDefault(dc => dc.DatabaseConnectionID == query.DatabaseConnectionID);

            if (database == null)
            {
                return NotFound();
            }

            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();

            if (PermissionMgr.UserCanModifyQuery(userPermissions, database) == false && database.OrganisationId != CurrentUser.OrganisationId)
            {
                return NotFound();
            }

            ViewBag.DatabaseConnectionID = database.DatabaseConnectionID;
            ViewBag.DatabaseName = database.Name;

            return View(query);
        }


        // POST: Simple/Create
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(Query query)
        {
            Query dbQuery = db.Queries.Find(query.QueryID);

            if (dbQuery == null || dbQuery.IsSimpleQuery == false)
            {
                return NotFound();
            }

            var database = db.DatabaseConnections.FirstOrDefault(dc => dc.DatabaseConnectionID == dbQuery.DatabaseConnectionID);

            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();

            if (database == null)
            {
                return NotFound();
            }

            if (PermissionMgr.UserCanModifyQuery(userPermissions, database) == false && database.OrganisationId != CurrentUser.OrganisationId)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                dbQuery.Name = query.Name;
                dbQuery.LastEditedBy = CurrentUser;
                dbQuery.LastEditedOn = DateTime.Now;
                dbQuery.QueryDefinition = query.QueryDefinition;
                dbQuery.Description = query.Description;

                db.SaveChanges();

                return RedirectToAction("Details", "Queries", new { id = query.QueryID });
            }

            ViewBag.DatabaseConnectionID = database.DatabaseConnectionID;
            ViewBag.DatabaseName = database.Name;

            return View(query);
        }

        public ActionResult Convert(int id)
        {
            Query dbQuery = db.Queries.Find(id);

            if (dbQuery == null || dbQuery.IsSimpleQuery == false)
            {
                return NotFound();
            }

            var database = db.DatabaseConnections.FirstOrDefault(dc => dc.DatabaseConnectionID == dbQuery.DatabaseConnectionID);

            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();

            if (database == null)
            {
                return NotFound();
            }

            if (PermissionMgr.UserCanModifyQuery(userPermissions, database) == false && database.OrganisationId != CurrentUser.OrganisationId)
            {
                return NotFound();
            }

            dbQuery.IsSimpleQuery = false;

            db.SaveChanges();

            return RedirectToAction("Edit", "Queries", new { id = id });
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
