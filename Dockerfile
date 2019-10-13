FROM microsoft/dotnet:2.2-sdk-stretch as builder
WORKDIR /build
COPY . .
RUN dotnet restore
RUN dotnet publish --no-restore -c Release ./Web/QueryTree.csproj -o /dist

FROM microsoft/dotnet:2.2-aspnetcore-runtime as runtime
WORKDIR /app
COPY --from=builder /dist .
COPY --from=builder /build/Web/EmailTemplates ./EmailTemplates
VOLUME /var/lib/querytree
ENV ConnectionStrings__DefaultConnection="Filename=/var/lib/querytree/querytree.db;"
ENV Passwords__Keyfile="/var/lib/querytree/querytree.key"
CMD dotnet QueryTree.dll
