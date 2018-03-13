using System;
using System.Collections.Generic;
using System.Linq;
using QueryTree.Models;
using QueryTree.ViewModels;
using QueryTree.Managers;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using QueryTree.Enums;


namespace QueryTree.Controllers
{
    [Authorize]
    public class HomeController : IdentityController
    {
        IPasswordManager _passwordManager;
        private DbManager _dbMgr;

        public HomeController(
            ApplicationDbContext dbContext,
            UserManager<ApplicationUser> userManager,
            IPasswordManager passwordManager,
            IConfiguration config,
            IMemoryCache cache)
            : base(userManager, dbContext)
        {
            _dbMgr = new DbManager(passwordManager, cache, config);
            _passwordManager = passwordManager;
        }

        // GET: DatabaseConnections
        public ActionResult Index()
        {
            string Email = User.Identity.Name;
            
            if (CurrentUser == null)
            {
                return RedirectToAction("Login", "Account");
            }

            if (db.OrganisationInvites.Any(uc => uc.InviteEmail == CurrentUser.Email && uc.AcceptedOn == null && uc.RejectedOn == null))
            {
                return RedirectToAction("Index", "Invitations");
            }

            var dbConnView = new List<DatabaseConnectionIndexViewModel>();

            var dbConns = db.DatabaseConnections
                .Where(d => d.OrganisationId == CurrentUser.OrganisationId)
                .Include(d => d.Organisation)
                .Include(d => d.Queries)
                .ThenInclude(q => q.ScheduledReport)
                .ToList();
            
            foreach (var dbConn in dbConns)
            {
                dbConnView.Add(new DatabaseConnectionIndexViewModel
                {
                    type = UserDatabaseTypes.Admin,
                    myConnection = dbConn,
                    DbOwner = dbConn.Organisation.OrganisationName,
                    ReportsCount = dbConn.Queries.Count(),
                    ScheduledReportsCount = dbConn.Queries.Count(q => q.ScheduledReport != null && q.ScheduledReport.FrequencyScheduled != FrequencyScheduled.None)
                });
            }

            var conns = db.DatabaseConnections
                .Include(uc => uc.Organisation)
                .Join(db.UserDatabaseConnections, db => db.DatabaseConnectionID, uc => uc.DatabaseConnectionID, (db, uc) => new { Uc = uc, Db = db })
                .Where(uc => uc.Uc.ApplicationUserID == CurrentUser.Id);

            foreach (var conn in conns)
            {
                dbConnView.Add(new DatabaseConnectionIndexViewModel
                {
                    type = conn.Uc.Type,
                    myConnection = conn.Db,
                    DbOwner = conn.Db.Organisation.OrganisationName,
                    ReportsCount = db.Queries.Count(q => q.DatabaseConnectionID == conn.Db.DatabaseConnectionID)
                });
            }
            
            return View(dbConnView);
        }

        // GET: DatabaseConnections/Details/5
        public ActionResult Details(int id)
        {
            var database = db.DatabaseConnections.FirstOrDefault(dc => dc.DatabaseConnectionID == id);
            
            if (database == null)
            {
                return NotFound();
            }

            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();

            if (PermissionMgr.UserCanViewDatabase(userPermissions, database) == false && database.OrganisationId != CurrentUser.OrganisationId)
            {
                return NotFound();
            }
            
            ViewBag.UserIsOrganisationAdmin = database.OrganisationId == CurrentUser.OrganisationId;
            ViewBag.UserCanModifyQueries = PermissionMgr.UserCanModifyQuery(userPermissions, database) || database.OrganisationId == CurrentUser.OrganisationId;
            ViewBag.UserCanModifyDatabase = PermissionMgr.UserCanModifyDatabase(userPermissions, database) || database.OrganisationId == CurrentUser.OrganisationId;
            ViewBag.UserCanManageDatabaseAccess = PermissionMgr.UserCanManageDatabaseAccess(userPermissions, database) || database.OrganisationId == CurrentUser.OrganisationId;
            ViewBag.UserCanDeleteDatabase = PermissionMgr.UserCanDeleteDatabase(userPermissions, database) || database.OrganisationId == CurrentUser.OrganisationId;

            var viewModel = new DatabaseConnectionDetailsViewModel
            {
                DatabaseConnectionID = database.DatabaseConnectionID,
                Name = database.Name,
                Type = database.Type,
                Server = database.Server,
                Port = database.Port,
                Username = database.Username,
                DatabaseName = database.DatabaseName,
                Description = database.Description,
                UseSsh = database.UseSsh,
                SshServer = database.SshServer,
                SshPort = database.SshPort,
                SshUsername = database.SshUsername,
                AccessUsers = new List<UserDatabaseConnection>()
            };
            List<DatabaseConnectionQueriesDetailsViewModel> viewQueries = new List<DatabaseConnectionQueriesDetailsViewModel>();
            
            var queries = db.Queries
                .Include(q => q.CreatedBy)
                .Include(q => q.LastEditedBy)
                .Where(q => q.DatabaseConnectionID == database.DatabaseConnectionID);
           
            foreach(var query in queries)
            {
                DatabaseConnectionQueriesDetailsViewModel queryView = new DatabaseConnectionQueriesDetailsViewModel();
                queryView.QueryID = query.QueryID;
                queryView.Name = query.Name;
				queryView.Description = query.Description;
                queryView.IsSimpleQuery = query.IsSimpleQuery;
                queryView.CreatedBy = query.CreatedBy;
                queryView.CreatedOn = query.CreatedOn;
                queryView.LastEditedBy = query.LastEditedBy;
                queryView.LastEditedOn = query.LastEditedOn;
                viewQueries.Add(queryView);
            }

            viewModel.SavedQueries = viewQueries.OrderByDescending(q => q.LastEditedOn);
            
            if (database.Organisation != null)
            {
                viewModel.OrganisationName = database.Organisation.OrganisationName;
            }
            else
            {
                viewModel.OrganisationName = "None";
            }

            if (ViewBag.UserCanModifyDatabase)
            {
                // Don't allow users to manage themselves, things get strange very quickly
                var accessUsers = db.UserDatabaseConnections
                    .Where(u => u.DatabaseConnection.DatabaseConnectionID == database.DatabaseConnectionID && u.ApplicationUserID != CurrentUser.Id)
                    .ToList();

                foreach (var accessUser in accessUsers)
                {
                    viewModel.AccessUsers.Add(new UserDatabaseConnection
                    {
                        UserDatabaseConnectionID = accessUser.UserDatabaseConnectionID,
                        DatabaseConnectionID = accessUser.DatabaseConnectionID,
                        ApplicationUser = accessUser.ApplicationUser,
                        Type = accessUser.Type,
                        CreatedBy = accessUser.CreatedBy,
                        CreatedOn = accessUser.CreatedOn,
                        InviteEmail = accessUser.InviteEmail,
                    });
                }
            }

            return View(viewModel);
        }

        // GET: DatabaseConnections/Create
        public ActionResult Create()
        {
            ViewBag.TestMessage = "";
            
            return View(new DatabaseConnectionViewModel
            {
                SshPort = 22
            });
        }

        // POST: DatabaseConnections/Create
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(DatabaseConnectionViewModel viewModel)
        {
            ViewBag.TestMessage = "";
            ViewBag.WillUpgrade = false;

            if (ModelState.IsValid)
            {                
                DatabaseConnection connection = new DatabaseConnection
                {
                    CreatedOn = DateTime.Now,
                    OrganisationId = CurrentUser.OrganisationId
                };

                string error;
                if (TryMapViewModel(viewModel, ref connection, out error) == false)
                {
                    ModelState.AddModelError("ssh-key-issue", "There was a problem with the SSH key file, please upload it again.");
                    viewModel.SshKeyFileID = null;
                    return View(viewModel);
                }

                db.DatabaseConnections.Add(connection);

                db.SaveChanges();

                SaveSecureInformation(connection, viewModel);

                return RedirectToAction("Details", new { id = connection.DatabaseConnectionID });
            }

            return View(viewModel);
        }

        private void DeleteSecureInformation(DatabaseConnection connection)
        {
            _passwordManager.DeleteSecret(SecretType.DatabasePassword.ToString() + "_" + connection.DatabaseConnectionID);

            if (connection.UseSsh && connection.UseSshKey == false)
            {
                _passwordManager.DeleteSecret(SecretType.SSHPassword.ToString() + "_" + connection.DatabaseConnectionID);
            }
        }
        
        // GET: DatabaseConnections/Edit/5
        public ActionResult Edit(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }
            
            var database = db.DatabaseConnections.FirstOrDefault(dc => dc.DatabaseConnectionID == id.Value);

            if (database == null)
            {
                return NotFound();
            }

            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();
            
            if (PermissionMgr.UserCanModifyDatabase(userPermissions, database) == false && database.OrganisationId != CurrentUser.OrganisationId)
            {
                return NotFound();
            }

            ViewBag.hasExistingKeyFile = database.UseSshKey;
            
            var viewModel = new DatabaseConnectionViewModel(database);
            
            if (viewModel.SshPort == null)
            {
                viewModel.SshPort = 22;
            }

            return View(viewModel);
        }

        private bool TryMapViewModel(DatabaseConnectionViewModel viewModel, ref DatabaseConnection connection, out string error)
        {
            error = null;

            // map fields
            connection.DatabaseName = viewModel.DatabaseName;
            connection.Name = viewModel.Name;
            connection.Port = viewModel.Port;
            connection.Server = viewModel.Server;
            connection.Type = viewModel.Type;
            connection.Username = viewModel.Username;
            connection.Description = viewModel.Description;

            if (connection.Type == DatabaseType.MySQL || connection.Type == DatabaseType.PostgreSQL)
            {
                connection.UseSsh = viewModel.UseSsh;
            }
            else
            {
                connection.UseSsh = false;
            }

            if (connection.UseSsh)
            {
                connection.SshServer = viewModel.SshServer;
                connection.SshPort = viewModel.SshPort;
                connection.SshUsername = viewModel.SshUsername;
                connection.UseSshKey = viewModel.UseSshKey;

                if (connection.UseSshKey)
                {
                    if (connection.SshKeyFileID != viewModel.SshKeyFileID)
                    {
                        var userId = _userManager.GetUserId(User);

                        var newSshKey = db.SshKeyFiles.SingleOrDefault(k => k.Id == viewModel.SshKeyFileID && k.CreatedBy.Id == userId);
                        if (newSshKey == null)
                        {
                            error = "There was a problem with the new SSH key file, please upload it again.";
                            viewModel.SshKeyFileID = null;
                            return false;
                        }
                        else
                        {
                            connection.SshKeyFileID = newSshKey.Id;
                            connection.SshKeyFile = newSshKey;
                        }
                    }
                }
                else
                {
                    connection.SshKeyFileID = null;
                    connection.SshKeyFile = null;
                }
            }
            else
            {
                connection.SshUsername = null;
                connection.SshServer = null;
                connection.SshPort = null;
            }

            return true;
        }

        // POST: DatabaseConnections/Edit/5
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(DatabaseConnectionViewModel viewModel)
        {
            DatabaseConnection existingConnection = db.DatabaseConnections.Find(viewModel.DatabaseConnectionID);
            if (existingConnection == null)
            {
                return NotFound();
            }
            
            if (ModelState.IsValid)
            {
                string error;
                if (TryMapViewModel(viewModel, ref existingConnection, out error) == false)
                {
                    ModelState.AddModelError("ssh-key-issue", "There was a problem with the SSH key file, please upload it again.");
                    viewModel.SshKeyFileID = null;
                    return View(viewModel);
                }

                // save to database
                db.Entry(existingConnection).State = EntityState.Modified;
                db.SaveChanges();

                SaveSecureInformation(existingConnection, viewModel);
                
                return RedirectToAction("Details", new { id = existingConnection.DatabaseConnectionID });
            }

            return View(viewModel);
        }

        // GET: DatabaseConnections/Delete/5
        public ActionResult Delete(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            DatabaseConnection database = db.DatabaseConnections.Find(id);
                        
            if (database == null)
            {
                return NotFound();
            }
            
            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();
            
            if (PermissionMgr.UserCanDeleteDatabase(userPermissions, database) == false && database.OrganisationId != CurrentUser.OrganisationId)
            {
                return NotFound();
            }

            return View(database);
        }

        // POST: DatabaseConnections/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(int id)
        {
            DatabaseConnection database = db.DatabaseConnections.Find(id);

            if (database == null)
            {
                return NotFound();
            }

            var userPermissions = db.UserDatabaseConnections
                .Where(uc => uc.ApplicationUserID == CurrentUser.Id)
                .ToList();

            if (PermissionMgr.UserCanDeleteDatabase(userPermissions, database) == false && database.OrganisationId != CurrentUser.OrganisationId)
            {
                return NotFound();
            }

            DeleteSecureInformation(database);

            db.DatabaseConnections.Remove(database);

            db.UserDatabaseConnections.RemoveWhere(uc => uc.DatabaseConnectionID == id);

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

        public ActionResult Model(int id)
        {
            DatabaseConnection databaseConnection = db.DatabaseConnections.Find(id);

            DbModel model = _dbMgr.GetDbModel(databaseConnection);

            var viewModel = new DbModelViewModel(model);
            viewModel.SelectedTable = viewModel.Tables.FirstOrDefault();

            if (viewModel.SelectedTable != null)
            {
                viewModel.SelectedTable.Parents = GetTableParents(viewModel, viewModel.SelectedTable);
            }

            return View(viewModel);
        }

        [HttpPost]
        public ActionResult Model(int id, string selectedTable)
        {
            DatabaseConnection databaseConnection = db.DatabaseConnections.Find(id);

            DbModel model = _dbMgr.GetDbModel(databaseConnection);

            var viewModel = new DbModelViewModel(model);
            viewModel.SelectedTable = viewModel.Tables.FirstOrDefault(t => t.Name == selectedTable);

            if (viewModel.SelectedTable != null)
            {
                viewModel.SelectedTable.Parents = GetTableParents(viewModel, viewModel.SelectedTable);
            }

            return View(viewModel);
        }

        public static List<DbTableViewModel> GetTableParents(DbModelViewModel model, DbTableViewModel table)
        {
            var tableLookup = model.Tables.ToDictionary(t => t.Name);

            Stack<DbTableViewModel> queue = new Stack<DbTableViewModel>();
            queue.Push(table);

            HashSet<DbTableViewModel> parents = new HashSet<DbTableViewModel>();

            while (queue.Any())
            {
                var curr = queue.Pop();

                if (parents.Contains(curr) == false)
                {
                    parents.Add(curr);

                    foreach (var col in curr.Columns)
                    {
                        if (string.IsNullOrEmpty(col.ParentTableName) == false)
                        {
                            var parentTable = tableLookup[col.ParentTableName];
                            if (parentTable != null)
                            {
                                queue.Push(parentTable);
                            }
                        }
                    }
                }
            }

            parents.Remove(table);

            return parents.ToList();
		}

		private void SaveSecureInformation(DatabaseConnection connection, DatabaseConnectionViewModel viewModel)
		{
            if (viewModel.DbPssword != null)
            {
                _passwordManager.SetSecret(SecretType.DatabasePassword.ToString() + "_" + connection.DatabaseConnectionID, viewModel.DbPssword);
            }

			if (connection.UseSsh && connection.UseSshKey == false && viewModel.SshPassword != null)
			{
				_passwordManager.SetSecret(SecretType.SSHPassword.ToString() + "_" + connection.DatabaseConnectionID, viewModel.SshPassword);
			}

            if (connection.UseSsh == false || connection.UseSshKey)
			{
				_passwordManager.DeleteSecret(SecretType.SSHPassword.ToString() + "_" + connection.DatabaseConnectionID);
			}
		}
    }
}
