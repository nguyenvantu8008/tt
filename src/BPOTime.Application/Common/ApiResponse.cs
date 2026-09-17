namespace BPOTime.Application.Common;

public class ApiResponse<T>
{
    public T? Data { get; set; }
    public ApiMetaData? Meta { get; set; }

    public ApiResponse(T data, ApiMetaData? meta = null)
    {
        Data = data;
        Meta = meta;
    }
}

public class ApiMetaData
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
