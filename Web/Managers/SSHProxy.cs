using Renci.SshNet;
using Renci.SshNet.Common;
using System;
using System.Net.Sockets;
using System.Threading;

namespace QueryTree.Managers
{
    public class SSHProxy
    {
        public readonly string ProxyServer = "127.0.0.1";

        public readonly string Server;

        public readonly int Port;

        public readonly string SshServer;

        public readonly int SshPort;

        public int ProxyPort { get; private set; }

        public string Error { get; set; }

        public SSHProxy(string server, int port, string sshServer, int sshPort, SshProxyCredentials sshCredentials)
        {
            this.Server = server;
            this.Port = port;
            this.SshServer = sshServer;
            this.SshPort = sshPort;
            this.SshCredentials = sshCredentials;

            _lastUsed = DateTime.Now;
        }


        public bool RequestUse()
        {
            bool result = false;

            if (_startedWaitEvent != null)
                _startedWaitEvent.WaitOne();

            lock (_usageLock)
            {
                if (_isRunning)
                {
                    _numCurrentUsers++;
                    result = true;
                    _lastUsed = DateTime.Now;
                }
            }

            return result;
        }

        public void EndUse()
        {
            lock (_usageLock)
            {
                if (_numCurrentUsers > 0)
                    _numCurrentUsers--;
            }
        }

        public void WaitUntilStarted()
        {
            lock(_usageLock)
            {
                if (_isStarted)
                    return;
            }
            if (_startedWaitEvent != null)
                _startedWaitEvent.WaitOne();
        }

        private SshClient GetSshClient()
        {
            if (SshCredentials.UseSshKey)
            {
                return new SshClient(SshServer, SshPort, SshCredentials.Username, SshCredentials.PrivateKeyFile);
            }
            else 
            {
                return new SshClient(SshServer, SshPort, SshCredentials.Username, SshCredentials.Password);
            }
        }

        public void Run()
        {
            try
            {
                using (var sshClient = GetSshClient())
                {
                    bool ended = false;
                    try
                    {
                        sshClient.Connect();

                        int triesLeft = Retries;
                        bool success = false;
                        do
                        {

                            ProxyPort = GetPort();
                            triesLeft--;
                            try
                            {
                                using (var forwardedPortLocal = new ForwardedPortLocal(ProxyServer, (uint)ProxyPort, this.Server, (uint)Port))
                                {
                                    sshClient.AddForwardedPort(forwardedPortLocal);
                                    try
                                    {
                                        forwardedPortLocal.Start();

                                        // proxy has started
                                        lock (_usageLock)
                                        {
                                            _isStarted = true;
                                            _isRunning = true;
                                            _numCurrentUsers = 0;
                                        }

                                        // signal started
                                        _startedWaitEvent.Set();

                                        // keep alive while running is set to true
                                        while (_isRunning)
                                        {
                                            Thread.Sleep(PollInterval);

                                            lock (_usageLock)
                                            {
                                                TimeSpan timeSinceLastUsed = DateTime.Now - _lastUsed;
                                                // if it's under the min lifetime let it stay alive
                                                // if its other the timeout, kill it regardless
                                                // if its in between check if anybody is using it.
                                                if (sshClient.IsConnected == false)
                                                    _isRunning = false;
                                                else if (timeSinceLastUsed < MinAliveTime)
                                                    _isRunning = true;
                                                else if (Timeout <= timeSinceLastUsed)
                                                    _isRunning = false;
                                                else
                                                    _isRunning = _numCurrentUsers > 0;

                                                if (_isRunning == false)
                                                    ended = true;
                                            }
                                        }
                                    }
                                    catch
                                    {
                                        throw;
                                    }
                                    finally
                                    {
                                        lock (_usageLock)
                                        {
                                            _isRunning = false;
                                        }
                                        if (forwardedPortLocal != null && forwardedPortLocal.IsStarted)
                                        {
                                            forwardedPortLocal.Stop();
                                        }
                                    }
                                }
                            }
                            catch (SocketException e)
                            {
                                if (e.SocketErrorCode == SocketError.AddressAlreadyInUse)
                                    success = false;
                                else
                                    Error = e.Message;
                            }
                        } while (success == false && triesLeft > 0 && ended == false);
                    }
                    catch (SocketException e)
                    {
                        switch (e.SocketErrorCode)
                        {
                            case SocketError.TimedOut: Error = "Connection timed out."; break;
                            case SocketError.AccessDenied: Error = "Access denied."; break;
                            case SocketError.HostNotFound: Error = string.Format("Host='{0}' could not be found.", Server); break;
                            default: Error = e.Message; break;
                        }
                    }
                    catch (SshException e)
                    {
                        if (e.Message == "User cannot be authenticated." || e.Message == "No suitable authentication method found to complete authentication.")
                        {
                            Error = string.Format("Access denied for user='{0}'.", SshCredentials.Username);
                        }
                        else
                        {
                            Error = e.Message;
                        }
                    }
                    catch (Exception e)
                    {
                        //Elmah.ErrorSignal.FromCurrentContext().Raise(e);
                        Error = "An unexpected error occurred: " + e;
                    }
                    finally
                    {
                        if (sshClient != null && sshClient.IsConnected)
                        {
                            sshClient.Disconnect();
                        }
                    }
                }
            }
            catch
            {
               
                Error = "An unexpected error occurred.";
            }
            finally
            {
                // signal started
                _startedWaitEvent.Set();
                SSHProxyManager.RemoveProxy(this);
            }
        }

        private static TimeSpan PollInterval = new TimeSpan(0, 0, 10);
        private static TimeSpan MinAliveTime = new TimeSpan(0, 2, 0);
        private static TimeSpan Timeout = new TimeSpan(0, 10, 0);

        private const int Retries = 10;

        private static object _portLock = new object();

        private static int _nextLocalPort = 10102;

        private static int GetPort()
        {
            int result;
            lock (_portLock)
            {
                result = _nextLocalPort;
                if (_nextLocalPort < 11102)
                    _nextLocalPort++;
                else
                    _nextLocalPort = 10102;
            }
            return result;
        }

        private object _usageLock = new object();

        private int _numCurrentUsers = 0;
        private DateTime _lastUsed;

        private bool _isRunning = false;
        private bool _isStarted = false;

        private ManualResetEvent _startedWaitEvent = new ManualResetEvent(false);

        private readonly SshProxyCredentials SshCredentials;
    }
}
