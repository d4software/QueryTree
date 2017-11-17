using MySql.Data.MySqlClient;
using QueryTree.Models;
using Renci.SshNet;
using Renci.SshNet.Common;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using QueryTree.Enums;

namespace QueryTree.Managers
{
    public class SshProxyCredentials
    {
        public readonly string Username;
        public readonly string Password;
        public readonly PrivateKeyFile PrivateKeyFile;
        public readonly bool UseSshKey;
        private IPasswordManager _passwordManager;

        public SshProxyCredentials(IPasswordManager passwordManager, string username, string password)
        {
            _passwordManager = passwordManager;
            Username = username;
            UseSshKey = false;
            Password = password;
        }

        public SshProxyCredentials(IPasswordManager passwordManager, string username, SshKeyFile sshKeyFile)
        {
            _passwordManager = passwordManager;

            this.Username = username;
            this.UseSshKey = true;

            this.PrivateKeyFile = null;
            if (sshKeyFile != null)
            {
                var data = _passwordManager.GetSecret(SecretType.SshKeyFile.ToString() + "_" + sshKeyFile.Id);
                if (data != null)
                {
                    this.PrivateKeyFile = new PrivateKeyFile(new MemoryStream(Convert.FromBase64String(data)));
                }
            }
        }


        public SshProxyCredentials(IPasswordManager passwordManager, DatabaseConnection connection)
        {
            _passwordManager = passwordManager;
            Username = connection.SshUsername;
            UseSshKey = connection.UseSshKey;
            if (connection.UseSsh)
            {
                this.PrivateKeyFile = null;
                if (connection.UseSshKey)
                {
                    if (connection.SshKeyFile != null)
                    {
                        var data = _passwordManager.GetSecret(SecretType.SshKeyFile.ToString() + "_" + connection.SshKeyFile.Id);
                        if (data != null)
                        {
                            this.PrivateKeyFile = new PrivateKeyFile(new MemoryStream(Convert.FromBase64String(data)));
                        }
                    }
                }
                else
                {
                    UseSshKey = false;

                    Password = _passwordManager.GetSecret(SecretType.SSHPassword.ToString() + "_" + connection.DatabaseConnectionID);
                }
            }
        }
    }    
}
