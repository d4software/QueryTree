
using QueryTree.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;

namespace QueryTree.Managers
{
    public static class SSHProxyManager
    {
        private static void Initialize()
        {
            lock (_lock)
            {
                if (_proxies == null)
                {
                    _proxies = new List<SSHProxy>();
                }
            }
        }

        private static object _lock = new object();

        private static List<SSHProxy> _proxies = null;

        private static void UseProxy(SSHProxy proxy, Action<SSHProxy> action)
        {
            try
            {
                action(proxy);
            }
            catch
            {
                throw;
            }
            finally
            {
                proxy.EndUse();
            }
        }

        private static bool TryAcquireExistingProxy(string server, int port, out SSHProxy proxy)
        {
            proxy = null;

            for (int i = 0; i < 4; i++)
            {
                lock (_lock)
                {
                    // try to reuse an existing proxy
                    var validProxies = _proxies.Where(p => p.Server == server && p.Port == port).ToList();

                    foreach (var validProxy in validProxies)
                    {

                        if (validProxy.RequestUse())
                        {
                            proxy = validProxy;
                            return true;
                        }
                    }
                }
            }

            return false;
        }
        
        public static bool TryUseProxy(string server, int port, string sshServer, int sshPort, SshProxyCredentials credentials, DatabaseConnection connection, Action<SSHProxy> action, out string error)
        {
            return TryUseProxy(server, port, sshServer, sshPort, credentials, action, out error);
        }

        public static bool TryUseProxy(IPasswordManager passwordManager, DatabaseConnection connection, Action<SSHProxy> action, out string error)
        {
            SshProxyCredentials credentials = new SshProxyCredentials(passwordManager, connection);
            return TryUseProxy(connection.Server, connection.Port, connection.SshServer, connection.SshPort.GetValueOrDefault(22), credentials, action, out error);
        }

        public static bool TryUseProxy(string server, int port, string sshServer, int sshPort, SshProxyCredentials credentials, Action<SSHProxy> action, out string error)
        {
            error = null;

            Initialize();

            SSHProxy proxy = null;

            if (TryAcquireExistingProxy(server, port, out proxy))
            {
                UseProxy(proxy, action);
                return true;
            }
            else 
            {
                proxy = new SSHProxy(server, port, sshServer, sshPort, credentials);

                lock (_lock)
                {
                    _proxies.Add(proxy);
                }

                Task.Run(() => proxy.Run());
                proxy.WaitUntilStarted();

                if (proxy.RequestUse())
                {
                    UseProxy(proxy, action);
                    return true;
                }
                else
                {
                    error = proxy.Error;
                    return false;
                }
            }
        }

        public static void RemoveProxy(SSHProxy proxy)
        {
            Initialize();
            lock (_lock)
            {
                _proxies.Remove(proxy);
            }
        }
    }
}
