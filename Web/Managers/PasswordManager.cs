using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Hosting;
using QueryTree.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace QueryTree.Managers
{
    public interface IPasswordManager
    {
        void SetSecret(string entityId, string value);
        void DeleteSecret(string entityId);
        string GetSecret(string entityId);
    }

    public class PasswordManager : IPasswordManager
    {
		private ApplicationDbContext _db;
		private IHostingEnvironment _env;
        private IOptions<PasswordsConfiguration> _config;

		public PasswordManager(
            ApplicationDbContext dbContext,
            IHostingEnvironment environment,
            IOptions<PasswordsConfiguration> config
        )
        {
            _db = dbContext;
            _env = environment;
            _config = config;
        }

        private byte[] GetRandomBytes(int len)
        {
            var rnd = RandomNumberGenerator.Create();
            var bytes = new byte[len];
            rnd.GetBytes(bytes);
            return bytes;
        }

        private string Encrypt(string val)
        {
            byte[] iv = GetRandomBytes(16);
            byte[] key = GetKey();

			using (var aesAlg = Aes.Create())
			{
				using (var encryptor = aesAlg.CreateEncryptor(key, iv))
				{
					using (var msEncrypt = new MemoryStream())
					{
						using (var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write))
						using (var swEncrypt = new StreamWriter(csEncrypt))
						{
							swEncrypt.Write(val);
						}

						var decryptedContent = msEncrypt.ToArray();

						var result = new byte[iv.Length + decryptedContent.Length];

						Buffer.BlockCopy(iv, 0, result, 0, iv.Length);
						Buffer.BlockCopy(decryptedContent, 0, result, iv.Length, decryptedContent.Length);

						return Convert.ToBase64String(result);
					}
				}
			}
        }

        private string Decrypt(string val)
        {
            byte[] key = GetKey();

			var fullCipher = Convert.FromBase64String(val);

			var iv = new byte[16];
			var cipher = new byte[fullCipher.Length-16];

			Buffer.BlockCopy(fullCipher, 0, iv, 0, iv.Length);
			Buffer.BlockCopy(fullCipher, iv.Length, cipher, 0, cipher.Length);
			
            using (var aes = Aes.Create())
            {
                aes.Key = key;
                aes.IV = iv;

                using (var decryptor = aes.CreateDecryptor(aes.Key, aes.IV))
                {
                    using (var msDecrypt = new MemoryStream(cipher))
                    {
                        using (var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read))
                        {
                            using (var srDecrypt = new StreamReader(csDecrypt))
                            {
                                return srDecrypt.ReadToEnd();
                            }
                        }
                    }
                }
            }
        }

        private byte[] GetKey()
        {
			var keyFilePath = Path.IsPathRooted(_config.Value.Keyfile) ?
                _config.Value.Keyfile :
                Path.Combine(_env.ContentRootPath, _config.Value.Keyfile);
            
            if (File.Exists(keyFilePath))
            {
                using (var keyFile = File.OpenRead(keyFilePath))
                {
                    var bytes = new byte[keyFile.Length];
                    keyFile.Read(bytes, 0, (int)keyFile.Length);
                    return bytes;
                }
            }
            else 
            {
                var key = GetRandomBytes(16);
                using (var keyFile = File.OpenWrite(keyFilePath))
                {
                    keyFile.Write(key, 0, key.Length);
                }
                return key;
            }
        }

        public void SetSecret(string entityId, string secret)
        {
            var dbSecret = _db.Secrets.FirstOrDefault(s => s.SecretID == entityId);
            if (dbSecret == null)
            {
                dbSecret = new Secret()
                {
                    SecretID = entityId
                };

                _db.Secrets.Add(dbSecret);
            }

            dbSecret.SecretData = Encrypt(secret);

            _db.SaveChanges();
        }

        public void DeleteSecret(string entityId)
        {
            _db.Secrets.RemoveWhere(s => s.SecretID == entityId);
        }

        public string GetSecret(string entityId)
        {
			var dbSecret = _db.Secrets.FirstOrDefault(s => s.SecretID == entityId);
            if (dbSecret != null) 
            {
                return Decrypt(dbSecret.SecretData);
            }

            return null;
        }
    }
}