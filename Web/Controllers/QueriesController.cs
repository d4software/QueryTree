using System;
using System.Linq;
using System.Net;
using QueryTree.Models;
using QueryTree.Managers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace QueryTree.Controllers
{
    [Authorize]
    public class QueriesController : IdentityController
    {
		public QueriesController(
            ApplicationDbContext dbContext,
            UserManager<ApplicationUser> userManager) 
            : base(userManager, dbContext)
		{
		}

		// GET: Queries/Details/5
        public ActionResult Details(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            Query query = db.Queries
                .Include(q => q.CreatedBy)
                .Include(q => q.LastEditedBy)
                .First(q => q.QueryID == id);

            var database = db.DatabaseConnections.FirstOrDefault(dc => dc.DatabaseConnectionID == query.DatabaseConnectionID);

            if (database == null)
            {
                return NotFound();
            }

            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();
            
            if (PermissionMgr.UserCanViewQuery(userPermissions, database) == false && database.OrganisationId != CurrentUser.OrganisationId)
            {
                return NotFound();
            }

            ViewBag.UserCanModifyQueries = PermissionMgr.UserCanModifyQuery(userPermissions, database) || database.OrganisationId == CurrentUser.OrganisationId;

            return View(query);
        }

        // GET: Queries/Create
        public ActionResult Create(int connectionId = 0)
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
            return View();
        }

        // POST: Queries/Create
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
                query.IsSimpleQuery = false;
                db.SaveChanges();

                return RedirectToAction("Details", new{id = query.QueryID});
            }

            ViewBag.DatabaseConnectionID = database.DatabaseConnectionID;
            ViewBag.DatabaseName = database.Name;

            return View(query);
        }

        // GET: Queries/Edit/5
        public ActionResult Edit(int id)
        {
            Query query = db.Queries.Find(id);

            if (query == null || query.IsSimpleQuery)
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

            return View(query);
        }

        // POST: Queries/Edit/5
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(Query query)
        {
            Query dbQuery = db.Queries.Find(query.QueryID);
            
            if (dbQuery == null)
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

                return RedirectToAction("Details", new { id = query.QueryID });
            }

            query.DatabaseConnection = db.DatabaseConnections.FirstOrDefault(dc => dc.DatabaseConnectionID == dbQuery.DatabaseConnectionID);

            return View(query);
        }

        // GET: Queries/Delete/5
        public ActionResult Delete(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }
            
            Query query = db.Queries.Find(id.Value);
            if (query == null)
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

            return View(query);
        }

        // POST: Queries/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(int id)
        {
            Query query = db.Queries.Find(id);
            if (query == null)
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

            db.Queries.Remove(query);
            db.SaveChanges();

            return RedirectToAction("Details", "Home", new { id = database.DatabaseConnectionID });
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
