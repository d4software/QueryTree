using System;
using System.Collections.Generic;

namespace QueryTree.Services 
{
	public sealed class EmailSenderService : IEmailSenderService 
	{
		private const int TimeoutInSeconds = 60;
		private readonly object _locker = new object();
		private readonly Dictionary<int, DateTime> _messageDeliveryTime = new Dictionary<int, DateTime>();

		public bool TrySetDelivered(int messageId) 
		{

			DateTime deliveredTime;
			if (!_messageDeliveryTime.TryGetValue(messageId, out deliveredTime) || deliveredTime.AddSeconds(TimeoutInSeconds) <= DateTime.UtcNow) 			
			{
				lock(_locker) 
				{
					if (!_messageDeliveryTime.TryGetValue(messageId, out deliveredTime) || deliveredTime.AddSeconds(TimeoutInSeconds) <= DateTime.UtcNow) 
					{
						_messageDeliveryTime[messageId] = DateTime.UtcNow;
						return true;
					}
				}
			}

			return false;
		}

	}
}