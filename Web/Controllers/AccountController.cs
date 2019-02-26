using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QueryTree.Models;
using QueryTree.Managers;
using QueryTree.ViewModels;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Cryptography;

namespace QueryTree.Controllers
{
    [Authorize]
    public class AccountController : IdentityController
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ILogger _logger;
        private readonly IEmailSender _emailSender;
        private readonly IConfiguration _config;

        public AccountController(
            ApplicationDbContext dbContext,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IEmailSender emailSender,
            IConfiguration config,
            ILoggerFactory loggerFactory) : base(userManager, dbContext)
        {
            _config = config;
            _emailSender = emailSender;
            _signInManager = signInManager;
            _logger = loggerFactory.CreateLogger<AccountController>();
        }

        //
        // GET: /Account/Login
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> Login(string returnUrl = null)
        {
            // If Windows Auth is enabled, check for a user and either sign up or sign in directly
            if (_config.GetValue<Enums.AuthenticationMode>("Customization:AuthenticationMode") == Enums.AuthenticationMode.Windows
                && User.Identity.IsAuthenticated)
            {
                var identity = ((ClaimsIdentity)HttpContext.User.Identity);

                var username = identity.Name.Split('\\').Last();
                var domain = identity.Name.Split('\\').First();
                var email = string.Format("{0}@{1}.local", username, domain);

                var user = await _userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    var rnd = RandomNumberGenerator.Create();
                    var bytes = new byte[64];
                    rnd.GetBytes(bytes);

                    user = await CreateUser(username, "", "", email, Base64UrlTextEncoder.Encode(bytes));
                }

                await _signInManager.SignInAsync(user, isPersistent: false);

                if (!String.IsNullOrWhiteSpace(returnUrl))
                {
                    return Redirect(returnUrl);
                }
                else
                {
                    return RedirectToAction("Index", "Home");
                }
            }
            else
            {
                // Clear the existing external cookie to ensure a clean login process
                await AuthenticationHttpContextExtensions.SignOutAsync(HttpContext);

                ViewData["ReturnUrl"] = returnUrl;
                return View();
            }
        }

        //
        // POST: /Account/Login
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model, string returnUrl = null)
        {
            ViewData["ReturnUrl"] = returnUrl;
            if (ModelState.IsValid)
            {
                // This doesn't count login failures towards account lockout
                // To enable password failures to trigger account lockout, set lockoutOnFailure: true
                var result = await _signInManager.PasswordSignInAsync(model.Email, model.Password, model.RememberMe, lockoutOnFailure: false);
                if (result.Succeeded)
                {
                    _logger.LogInformation(1, "User logged in.");
                    return RedirectToLocal(returnUrl);
                }
                if (result.IsLockedOut)
                {
                    _logger.LogWarning(2, "User account locked out.");
                    return View("Lockout");
                }
                else
                {
                    ModelState.AddModelError(string.Empty, "Invalid login attempt.");
                    return View(model);
                }
            }

            // If we got this far, something failed, redisplay form
            return View(model);
        }
        
        [HttpGet]
        [AllowAnonymous]
        public IActionResult Register(string email)
        {
            var model = new RegisterViewModel();
            model.Email = email;

            return View(model);
        }

        private async Task<ApplicationUser> CreateUser(string firstName, string lastName, string organisationName, string email, string password)
        {
            var user = new ApplicationUser { FirstName = firstName, LastName = lastName, UserName = email, Email = email, CreatedOn = DateTime.Now };
            var org = new Organisation { OrganisationName = organisationName, CreatedOn = DateTime.Now };

            db.Add(org);

            user.Organisation = org;

            var result = await _userManager.CreateAsync(user, password);

            if (result.Succeeded)
            {
                var dbInvtations = db.UserDatabaseConnections.Where(u => u.InviteEmail == user.Email);
                foreach (var invitation in dbInvtations)
                {
                    invitation.InviteEmail = null;
                    invitation.ApplicationUserID = user.Id;
                }
                db.SaveChanges();

                return user;
            }

            AddErrors(result);

            return null;
        }

        //
        // POST: /Account/Register
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Register(RegisterViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = await CreateUser(model.FirstName, model.LastName, model.OrganisationName, model.Email, model.Password);

                if (user != null)
                { 
                    await _signInManager.SignInAsync(user, isPersistent:false);

                    return RedirectToAction("Index", "Home");
                }
            }

            // If we got this far, something failed, redisplay form
            ViewBag.ReCaptchaPublicKey = _config.GetValue<string>("ReCaptchaPublickey");
            return View(model);
        }

        //
        // GET: /Account/ConfirmEmail
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmEmail(string userId, string code)
        {
            if (userId == null || code == null)
            {
                return View("Error");
            }
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return View("Error");
            }
            var result = await _userManager.ConfirmEmailAsync(user, code);
            return View(result.Succeeded ? "ConfirmEmail" : "Error");
        }

        //
        // GET: /Account/ForgotPassword
        [HttpGet]
        [AllowAnonymous]
        public IActionResult ForgotPassword()
        {
            return View();
        }

        //
        // POST: /Account/ForgotPassword
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = await _userManager.FindByEmailAsync(model.Email);
                if (user == null)
                {
                    // Don't reveal that the user does not exist or is not confirmed
                    return View("ForgotPasswordConfirmation");
                }

                string code = await _userManager.GeneratePasswordResetTokenAsync(user);

                var callbackUrl = Url.Action("ResetPassword", "Account", new { userId = user.Id, code = code }, protocol: Request.Scheme);

                _emailSender.SendMail(user.Email, "Reset Password", "Please reset your password by clicking <a href=\"" + callbackUrl + "\">here</a>. If you did not request this password reset, you can safely ignore it - nothing has been changed.");

                return RedirectToAction("ForgotPasswordConfirmation", "Account");
            }

            // If we got this far, something failed, redisplay form
            return View(model);
        }

        //
        // GET: /Account/ForgotPasswordConfirmation
        [HttpGet]
        [AllowAnonymous]
        public IActionResult ForgotPasswordConfirmation()
        {
            return View();
        }

        //
        // GET: /Account/ResetPassword
        [HttpGet]
        [AllowAnonymous]
        public IActionResult ResetPassword(string code = null)
        {
            return code == null ? View("Error") : View();
        }

        //
        // POST: /Account/ResetPassword
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResetPassword(ResetPasswordViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                // Don't reveal that the user does not exist
                return RedirectToAction(nameof(AccountController.ResetPasswordConfirmation), "Account");
            }
            var result = await _userManager.ResetPasswordAsync(user, model.Code, model.Password);
            if (result.Succeeded)
            {
                return RedirectToAction(nameof(AccountController.ResetPasswordConfirmation), "Account");
            }
            AddErrors(result);
            return View();
        }

        //
        // GET: /Account/ResetPasswordConfirmation
        [HttpGet]
        [AllowAnonymous]
        public IActionResult ResetPasswordConfirmation()
        {
            return View();
        }

        //
        // POST: /Account/LogOff
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            _logger.LogInformation(4, "User logged out.");
            return RedirectToAction("Index", "Home");
        }

        [HttpGet]
        public IActionResult AccessDenied()
        {
            return View();
        }

        // GET: Account/
        public ActionResult Index(string message = null)
        {
            db.Entry(CurrentUser).Reference(u => u.Organisation).Load();

            var vm = new SettingsViewModel()
            {
                OrganisationName = CurrentUser.Organisation.OrganisationName,
                NumberOfUsers = CurrentUser.Organisation.NumberOfUsers,
                NumberOfConnections = CurrentUser.Organisation.NumberOfConnections
            };

            var otherConnections = new List<SettingsDatabaseConnectionViewModel>();

            string userId = CurrentUser.Id;

            foreach (var conn in db.UserDatabaseConnections.Include(dbc => dbc.DatabaseConnection).Where(dbc => dbc.ApplicationUserID == userId).ToList())
            {
                var connType = EnumHelper<UserDatabaseTypes>.GetEnumDisplayValue(conn.Type);
                otherConnections.Add(new SettingsDatabaseConnectionViewModel() { ConnectionName = conn.DatabaseConnection.Name, ConnectionType = connType });
            }

            vm.OtherConnections = otherConnections;
            
            ViewBag.InfoAlert = message;

            return View(vm);
        }
        
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Index(SettingsViewModel settings)
        {
            db.Entry(CurrentUser).Reference(u => u.Organisation).Load();

            CurrentUser.Organisation.OrganisationName = settings.OrganisationName;
            
            await db.SaveChangesAsync();

            return Index();
        }

        #region Helpers

        private void AddErrors(IdentityResult result)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }
        }

        private IActionResult RedirectToLocal(string returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
            {
                return Redirect(returnUrl);
            }
            else
            {
                return RedirectToAction(nameof(HomeController.Index), "Home");
            }
        }

        #endregion
    }
}
