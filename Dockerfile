FROM mcr.microsoft.com/dotnet/core/sdk:3.1 as builder
WORKDIR /build
COPY . .
RUN dotnet restore
RUN dotnet publish --no-restore -c Release ./Web/QueryTree.csproj -o /dist

FROM mcr.microsoft.com/dotnet/core/aspnet:3.1 as runtime
WORKDIR /app
COPY --from=builder /dist .
COPY --from=builder /build/Web/EmailTemplates ./EmailTemplates
VOLUME /var/lib/querytree
ENV ConnectionStrings__DefaultConnection="Filename=/var/lib/querytree/querytree.db;"
ENV Passwords__Keyfile="/var/lib/querytree/querytree.key"
CMD dotnet QueryTree.dll
