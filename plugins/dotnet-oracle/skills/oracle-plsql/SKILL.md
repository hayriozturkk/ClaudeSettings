---
name: oracle-plsql
description: Oracle PL/SQL standardı — package/procedure/function isimlendirme ve yapısı, parametre ve değişken önekleri, hata yönetimi (RAISE_APPLICATION_ERROR kod aralıkları), transaction kuralları, dinamik SQL, BULK COLLECT/FORALL ve REF CURSOR ile sonuç döndürme. Package, procedure, function veya anonim PL/SQL bloğu yazılırken HER ZAMAN kullan.
---

# Oracle PL/SQL standardı

> Başlangıç standardıdır. Projede yerleşik package isimleri, hata kodu tablosu veya log package'ı varsa (proje haritası `veritabani.md`) onu kullan.

## 1. Yapı
- Mantık **package** içinde yazılır; bağımsız (standalone) procedure/function açılmaz.
- Package adı: `PKG_<ALAN>` (`PKG_ORDERS`, `PKG_INVOICE`). Trigger yardımcıları: `PKG_<TABLO>_TRG`.
- Spec ve body ayrı dosyalarda: `pkg_orders.pks`, `pkg_orders.pkb` (projede tek dosya düzeni varsa ona uy).
- Spec'te yalnızca dışarıdan çağrılacak procedure/function'lar yer alır; yardımcılar yalnızca body'de.

## 2. İsimlendirme
| Öğe | Önek | Örnek |
|---|---|---|
| Procedure | `P_` | `P_CANCEL_ORDER` |
| Function | `F_` | `F_GET_ORDER_TOTAL` |
| Parametre | `p_` | `p_order_id` |
| Yerel değişken | `v_` | `v_total` |
| Sabit | `c_` | `c_status_cancelled` |
| Package seviyesi değişken | `g_` | `g_batch_size` |
| Cursor | `cur_` | `cur_open_orders` |
| Tip | `t_` | `t_order_tab` |
| Exception | `e_` | `e_order_not_found` |

- Tip tanımlarında `%TYPE` ve `%ROWTYPE` kullan: `p_order_id IN ORDERS.ID%TYPE`.
- Parametre yönü her zaman yazılır: `IN`, `OUT`, `IN OUT`.
- Çağrılarda isimli notasyon: `PKG_ORDERS.P_CANCEL_ORDER(p_order_id => v_id, p_reason => v_reason);`

## 3. Transaction
- C#'tan çağrılan procedure'lerde **`COMMIT` ve `ROLLBACK` yoktur**; transaction'ı uygulama yönetir.
- Sadece DB içinde çalışan job/batch procedure'leri kendi commit'ini yapabilir; bu durumda spec'te yorumla belirtilir.
- `PRAGMA AUTONOMOUS_TRANSACTION` yalnızca hata/olay loglama procedure'lerinde kullanılır.

## 4. Hata yönetimi
- İş hataları `RAISE_APPLICATION_ERROR(-20xxx, 'mesaj')` ile fırlatılır. Kod aralıkları:

| Aralık | Kullanım |
|---|---|
| -20000 – -20099 | Genel / ortak hatalar |
| -20100 – -20999 | Modül bazlı; her package'a 100'lük bir blok (projede tablo varsa ona uy) |

- Hata kodları package spec'inde sabit olarak tanımlanır: `c_err_order_not_found CONSTANT PLS_INTEGER := -20101;`
- Mesaj kullanıcıya gösterilebilecek biçimde, anlaşılır olur (C# tarafı bu aralığı 422 olarak döner; bkz. `dotnet-hata-ve-loglama`).
- `WHEN OTHERS` yalnızca loglayıp **yeniden fırlatmak** için:
  ```sql
  EXCEPTION
    WHEN OTHERS THEN
      PKG_LOG.P_ERROR(p_source => 'PKG_ORDERS.P_CANCEL_ORDER', p_message => SQLERRM, p_backtrace => DBMS_UTILITY.FORMAT_ERROR_BACKTRACE);
      RAISE;
  ```
- `WHEN OTHERS THEN NULL` **yasak**.
- `SELECT ... INTO` kullanırken `NO_DATA_FOUND` ve `TOO_MANY_ROWS` bilinçli ele alınır.

## 5. SQL ve performans
- Satır satır döngü yerine set tabanlı SQL tercih edilir (tek `UPDATE ... WHERE`).
- Döngü kaçınılmazsa `BULK COLLECT ... LIMIT 1000` ve `FORALL` kullanılır.
- Dinamik SQL'de değerler **bind variable** ile verilir: `EXECUTE IMMEDIATE v_sql USING p_id;`
  Değeri SQL metnine birleştirmek yasak. Tablo/kolon adı dinamikse `DBMS_ASSERT.SIMPLE_SQL_NAME` ile doğrulanır.
- Kod içinde `SELECT *` yok.

## 6. C#'a sonuç döndürme
- Liste dönen procedure'ler `SYS_REFCURSOR` OUT parametresi kullanır; parametre adı `p_result`.
- Cursor kolon adları C# modeliyle eşleşecek şekilde açıkça adlandırılır.

## 7. Şablon
```sql
CREATE OR REPLACE PACKAGE PKG_ORDERS AS
  c_err_order_not_found CONSTANT PLS_INTEGER := -20101;
  c_err_invalid_status  CONSTANT PLS_INTEGER := -20102;

  -- Siparişi iptal eder. COMMIT yapmaz; transaction çağıran uygulamaya aittir.
  PROCEDURE P_CANCEL_ORDER(
    p_order_id IN ORDERS.ID%TYPE,
    p_reason   IN ORDERS.CANCEL_REASON%TYPE
  );

  PROCEDURE P_GET_BY_CUSTOMER(
    p_customer_id IN  ORDERS.CUSTOMER_ID%TYPE,
    p_result      OUT SYS_REFCURSOR
  );
END PKG_ORDERS;
/

CREATE OR REPLACE PACKAGE BODY PKG_ORDERS AS

  PROCEDURE P_CANCEL_ORDER(
    p_order_id IN ORDERS.ID%TYPE,
    p_reason   IN ORDERS.CANCEL_REASON%TYPE
  ) IS
    v_status ORDERS.STATUS%TYPE;
  BEGIN
    SELECT STATUS INTO v_status FROM ORDERS WHERE ID = p_order_id FOR UPDATE;

    IF v_status = 'SHIPPED' THEN
      RAISE_APPLICATION_ERROR(c_err_invalid_status, 'Kargoya verilmiş sipariş iptal edilemez.');
    END IF;

    UPDATE ORDERS
       SET STATUS = 'CANCELLED',
           CANCEL_REASON = p_reason
     WHERE ID = p_order_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(c_err_order_not_found, 'Sipariş bulunamadı: ' || p_order_id);
  END P_CANCEL_ORDER;

  PROCEDURE P_GET_BY_CUSTOMER(
    p_customer_id IN  ORDERS.CUSTOMER_ID%TYPE,
    p_result      OUT SYS_REFCURSOR
  ) IS
  BEGIN
    OPEN p_result FOR
      SELECT ID          AS ID,
             ORDER_NO    AS ORDER_NO,
             STATUS      AS STATUS,
             ORDER_DATE  AS ORDER_DATE
        FROM ORDERS
       WHERE CUSTOMER_ID = p_customer_id
       ORDER BY ORDER_DATE DESC;
  END P_GET_BY_CUSTOMER;

END PKG_ORDERS;
/
```

## Kontrol listesi
Zorunlu:
- [ ] Mantık package içinde; isimler ve önekler tabloya uygun
- [ ] C#'tan çağrılan kodda COMMIT/ROLLBACK yok
- [ ] `WHEN OTHERS THEN NULL` yok; `WHEN OTHERS` loglayıp `RAISE` ediyor
- [ ] İş hataları tanımlı aralıkta `RAISE_APPLICATION_ERROR` ile
- [ ] Dinamik SQL bind variable kullanıyor
- [ ] `SELECT *` yok

Tavsiye:
- [ ] `%TYPE` / `%ROWTYPE` kullanılmış
- [ ] Döngüler yerine set tabanlı SQL veya BULK COLLECT/FORALL
- [ ] Çağrılarda isimli notasyon
- [ ] Spec'te her public procedure için kısa açıklama yorumu
