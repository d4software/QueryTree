using System;
using System.Linq;
using System.Collections.Generic;
using QueryTree.Models;
using System.IO;
using QueryTree.Managers;
using Renci.SshNet;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using QueryTree.Enums;


namespace QueryTree.Controllers
{
    [Authorize]
    public class SshKeyFileController : IdentityController
    {
        IPasswordManager _passwordManager;

		public SshKeyFileController(
            ApplicationDbContext dbContext,
            IPasswordManager passwordManager,
            UserManager<ApplicationUser> userManager)
            : base(userManager, dbContext)
		{
            _passwordManager = passwordManager;
		}

        [HttpPost]
        public ActionResult Upload()
        {
            ClearOldFiles();

            if (Request.Form.Files.Any())
            {
                var file = Request.Form.Files[0];

                MemoryStream target = new MemoryStream();
                file.OpenReadStream().CopyTo(target);
                byte[] data = target.ToArray();

                SshKeyFile keyFile = new SshKeyFile()
                {
                    Filename = file.FileName,
                    ContentType = file.ContentType,
                    CreatedOn = DateTime.Now,
                    CreatedBy = CurrentUser
                };

                if (ValidateSshKeyFile(data))
                {
                    db.SshKeyFiles.Add(keyFile);
                    db.SaveChanges();

                    string dataString = Convert.ToBase64String(data);
                    _passwordManager.SetSecret(SecretType.SshKeyFile.ToString() + "_" + keyFile.Id, dataString);
                }
                else
                {
                    return Json(new { Status = "error", Message = "The file you uploaded was not a valid SSH key file, please upload a different file." });
                }

                return Json(new { Status = "ok", SshKeyFileID = keyFile.Id, Filename = keyFile.Filename });
            } else {
                return Json(new { Status = "error" , Message = "Error uploading file, please try again" });
            }
        }
        
        private bool ValidateSshKeyFile(byte[] data)
        {
            try
            {
                PrivateKeyFile p = new PrivateKeyFile(new MemoryStream(data));
                return true;
            }
            catch
            {
                return false;
            }
        }

        private void ClearOldFiles()
        {
            DateTime threshold = DateTime.Now.AddMinutes(-5);

            var filesToDelete = db.SshKeyFiles
                .GroupJoin(db.DatabaseConnections, k => k.Id, d => d.SshKeyFileID, (k, ds) => new { SshKeyFile = k, InUse = ds.DefaultIfEmpty().Any() })
                .Where(_ => _.InUse == false && _.SshKeyFile.CreatedOn < threshold)
                .Select(_ => _.SshKeyFile)
                .ToList();

            foreach (var keyFile in filesToDelete)
            {

                _passwordManager.DeleteSecret(SecretType.SshKeyFile.ToString() + "_" + keyFile.Id);
            }

            db.SshKeyFiles.RemoveRange(filesToDelete);
            db.SaveChanges();
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
