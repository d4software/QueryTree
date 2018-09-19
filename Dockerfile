FROM microsoft/aspnetcore-build:2.0-stretch as builder
WORKDIR /build
COPY . .
RUN npm install less -g
RUN dotnet restore
RUN dotnet publish -c Release ./Web/QueryTree.csproj -o /dist


FROM microsoft/aspnetcore:2.0-stretch as runtime
WORKDIR /app
COPY --from=builder /dist .
COPY ./Web/EmailTemplates ./EmailTemplates
VOLUME /var/lib/querytree
ENV ConnectionStrings__DefaultConnection="Filename=/var/lib/querytree/querytree.db;"
ENV Passwords__Keyfile="/var/lib/querytree/querytree.key"
CMD dotnet QueryTree.dll
