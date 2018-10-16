namespace QueryTree.Services 
{
	public interface IEmailSenderService 
	{
		bool TrySetDelivered(int messageId);
	}
}