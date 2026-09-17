namespace BPOTime.Application.Authentication;

public interface IJwtProvider
{
    string GenerateToken(Guid userId, string email, IList<string> roles);
}
