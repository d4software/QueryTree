using System;

namespace QueryTree.Enums
{
    public enum SecretType : int 
    { 
        DatabasePassword = 0, 
        SSHPassword = 1, 
        SshKeyFile = 3 
    }
}
