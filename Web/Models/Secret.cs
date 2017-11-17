using System;
using System.Collections.Generic;
using System.Linq;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace QueryTree.Models
{
    /// <summary>
    /// A database table used to hold encrypted passwords. This class is used
    /// by the default IPasswordManager implemenation, but you can store
    /// user's passwords elsewhere by implmenting your own IPasswordManager.
    /// </summary>
    public class Secret
    {
		[Key]
		public string SecretID { get; set; }
		public string SecretData { get; set; }
    }
}
