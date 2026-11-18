---
name: dotnet-veri-erisimi
description: .NET'ten Oracle'a veri erişim standardı — EF Core, Dapper ve ADO.NET/stored procedure'den hangisinin ne zaman kullanılacağı, parametre bağlama (BindByName), transaction, tip eşleme, sayfalama ve Oracle'a özgü tuzaklar. Repository, sorgu, DbContext, Dapper sorgusu, OracleCommand veya procedure çağrısı yazılırken HER ZAMAN kullan.
---

# Veri erişimi standardı (.NET + Oracle)

> Başlangıç standardıdır; ekip kararlarına göre güncellenir.

## 1. Hangi yöntem?
Ekip üç yöntemi de kullanır. Seçim kuralı:

| Durum | Yöntem |
|---|---|
| Tek bir aggregate üzerinde CRUD, change tracking işe yarıyor, sorgu basit | **EF Core** |
| Okuma ağırlıklı liste/rapor, karmaşık join, performans kritik sorgu | **Dapper** |
| Mevcut PL/SQL package/procedure çağrısı, REF CURSOR, toplu (bulk) yazma, iş mantığı DB'de | **ADO.NET (OracleCommand)** |

- **Önce projeye bak:** Proje haritasındaki `veri-erisimi.md` hangi katmanda hangi yöntemin kullanıldığını söyler. Aynı tür iş için projede yerleşik yöntem neyse onu kullan.
- Projede hiç kullanılmayan bir yöntemi (örn. sadece Dapper olan projeye EF Core) karar olmadan ekleme; analiz/karar adımında sorulmalı.
- Aynı repository sınıfında yöntem karıştırma; gerekiyorsa ayrı sınıf.

## 2. Güvenlik — SQL injection
- SQL'e **asla** string birleştirme veya interpolation ile değer koyma. Her değer parametre ile bağlanır.
  ```csharp
  // YASAK
  var sql = $"SELECT ID FROM ORDERS WHERE CUSTOMER_NO = '{customerNo}'";
  // DOĞRU
  const string sql = "SELECT ID FROM ORDERS WHERE CUSTOMER_NO = :customerNo";
  ```
- Dinamik kolon/tablo adı gerekiyorsa (sıralama gibi) yalnızca **beyaz listeden** seç (`switch` ile sabit adlar).
- EF Core'da `FromSqlRaw` ile interpolation yasak; `FromSql($"...")` (parametreleştirilmiş) veya `FromSqlRaw` + parametre kullan.

## 3. Oracle parametre bağlama
- Oracle'da parametre ön eki `:`'dir (`:orderId`). `@` kullanma.
- **ADO.NET:** `OracleCommand.BindByName` varsayılan olarak `false`'tur; parametreler **sıraya göre** bağlanır ve isimler yok sayılır.
  Her `OracleCommand` için `BindByName = true` **zorunlu**.
  ```csharp
  await using var cmd = connection.CreateCommand();
  cmd.BindByName = true;
  cmd.CommandText = "UPDATE ORDERS SET STATUS = :status WHERE ID = :id";
  cmd.Parameters.Add("status", OracleDbType.Varchar2).Value = status;
  cmd.Parameters.Add("id", OracleDbType.Int64).Value = id;
  ```
- **Dapper:** Anonim nesne ile parametre geç (`new { id, status }`); isimler SQL'deki `:id`, `:status` ile birebir eşleşmeli.
- `IN` listesinde en fazla 1000 eleman olabilir (ORA-01795). Daha büyük listeler için parçala veya geçici tablo/collection kullan.

## 4. Bağlantı ve transaction
- Bağlantı geç açılır, erken kapanır: `await using var connection = ...; await connection.OpenAsync(cancellationToken);`
- Bağlantı nesnesini alan olarak saklama; connection pooling zaten var.
- Birden fazla yazma işlemi tek iş birimiyse **tek transaction** içinde:
  - EF Core: tek `SaveChangesAsync` veya `Database.BeginTransactionAsync`.
  - Dapper/ADO.NET: `connection.BeginTransaction()` ve her komuta transaction'ı geç.
- Transaction'ı uygulama yönetir: C#'tan çağrılan procedure'ler içinde `COMMIT` olmamalı (bkz. `oracle-plsql`).
- Connection string kodda değil konfigürasyonda; loglanmaz.

## 5. Tip eşleme
| Oracle | C# |
|---|---|
| `NUMBER(1)` (0/1 bayrak) | `bool` |
| `NUMBER(5)` | `short` |
| `NUMBER(10)` | `int` |
| `NUMBER(19)` | `long` |
| `NUMBER(p,s)` (s > 0) | `decimal` |
| `VARCHAR2`, `NVARCHAR2` | `string` |
| `DATE` | `DateTime` (saat bilgisi de içerir) |
| `TIMESTAMP` | `DateTime` |
| `CLOB` | `string` |
| `BLOB` | `byte[]` |

- NULL olabilen kolon → nullable C# tipi (`int?`, `DateTime?`).
- **Oracle'da boş string (`''`) NULL'dur.** `WHERE NAME = ''` hiçbir satır döndürmez; boş string kontrolü `IS NULL` ile yapılır.
  C#'ta boş string yazdığında DB'den `null` okuyacağını hesaba kat.
- Oracle tanımlayıcıları büyük harftir. EF Core'da tablo ve kolon adlarını açıkça eşle (`ToTable("ORDERS")`, `HasColumnName("ORDER_DATE")`); Dapper'da kolonları `AS "PropertyName"` ile veya projedeki mapping yöntemiyle eşle.

## 6. Sorgu kuralları
- `SELECT *` yasak; ihtiyaç duyulan kolonları yaz.
- Sayfalama: `OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY` (Oracle 12c+). Projede eski `ROWNUM` deseni varsa ona uy.
- SQL metinleri C#'ta raw string literal (`"""`) ile, okunabilir biçimde. Projede SQL'ler ayrı `.sql` dosyalarında/embedded resource'ta tutuluyorsa ona uy.
- EF Core:
  - Salt okuma sorgularında `AsNoTracking()`.
  - N+1'den kaçın: gerekli ilişkileri `Include` ile veya projeksiyonla (`Select`) çek.
  - Liste döndüren sorgular projeksiyonla DTO'ya map'lenir; tüm entity grafiğini çekme.
- Liste sorgularında sınırsız sonuç dönme; sayfalama veya üst sınır koy.

## 7. Procedure ve REF CURSOR (ADO.NET)
```csharp
await using var cmd = connection.CreateCommand();
cmd.BindByName = true;
cmd.CommandType = CommandType.StoredProcedure;
cmd.CommandText = "PKG_ORDER.P_GET_BY_CUSTOMER";
cmd.Parameters.Add("p_customer_id", OracleDbType.Int64).Value = customerId;
cmd.Parameters.Add("p_result", OracleDbType.RefCursor, ParameterDirection.Output);

await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
while (await reader.ReadAsync(cancellationToken)) { /* map */ }
```
- Toplu ekleme için satır satır döngü yerine Oracle array binding (`cmd.ArrayBindCount`) kullan.

## Kontrol listesi
Zorunlu:
- [ ] SQL'de string birleştirme/interpolation ile değer yok; her değer parametreli
- [ ] Her `OracleCommand`'da `BindByName = true`
- [ ] Parametre ön eki `:`
- [ ] Bağlantılar `await using` ile kapatılıyor
- [ ] Çok adımlı yazma tek transaction içinde
- [ ] `SELECT *` yok; liste sorguları sınırlı/sayfalı
- [ ] `CancellationToken` veri erişimine kadar taşınıyor
- [ ] Boş string = NULL davranışı hesaba katılmış

Tavsiye:
- [ ] Yöntem seçimi tabloya ve projenin yerleşik desenine uygun
- [ ] EF Core okuma sorgularında `AsNoTracking`, N+1 yok
- [ ] Tip eşleme tabloya uygun, nullable kolonlar nullable tipte
