//+------------------------------------------------------------------+
//|                                           TradeJournalSync.mq5   |
//|                        Copyright 2026, Trading Journal PWA       |
//|                                   https://trading-journal.app   |
//+------------------------------------------------------------------+
#property copyright "Trading Journal PWA"
#property link      "https://trading-journal.app"
#property version   "1.60"
#property description "Auto-sync Trades, Open Positions, Live Prices & Balance to Trading Journal System"

//--- Inputs
input group "=== Webhook Configuration ==="
input string   InpWebhookURL    = "http://127.0.0.1:3000/api/mt5/sync"; // Webhook URL (Use 127.0.0.1 for MT5 compatibility)
input string   InpApiKey        = "tradejournal_mt5_secret_key_2026";   // API Secret Key
input string   InpPortfolioId   = "portfolio-demo-1";                  // Target Portfolio ID
input ulong    InpMagicFilter   = 0;                                   // Magic Number (0 = All trades)
input int      InpSyncInterval  = 1;                                   // Sync Interval (Seconds)

// Global state tracking
datetime lastSyncTime = 0;

//+------------------------------------------------------------------+
//| Helper: Send JSON payload via WebRequest                         |
//+------------------------------------------------------------------+
bool SendJsonToWebhook(string jsonString)
{
   char postData[];
   char resultData[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\nx-api-key: " + InpApiKey + "\r\n";
   
   StringToCharArray(jsonString, postData, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(postData, ArraySize(postData) - 1); // remove null terminator

   ResetLastError();
   int timeout = 5000; // 5 seconds
   int res = WebRequest("POST", InpWebhookURL, headers, timeout, postData, resultData, resultHeaders);

   if(res == -1)
   {
      int err = GetLastError();
      PrintFormat("[TradeJournal] ❌ WebRequest failed! Error code: %d", err);
      if(err == 4014)
      {
         PrintFormat("[TradeJournal] ⚠️ PLEASE ALLOW URL IN MT5: Tools -> Options -> Expert Advisors -> Allow WebRequest for URL: %s", InpWebhookURL);
      }
      return false;
   }
   else
   {
      string responseText = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
      PrintFormat("[TradeJournal] ✅ Synced to Journal (%d): %s", res, responseText);
      return (res == 200 || res == 201);
   }
}

//+------------------------------------------------------------------+
//| Batch Sync: Balance, Equity & All Currently Open Positions       |
//+------------------------------------------------------------------+
void SyncBatchAll()
{
   double balance     = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity      = AccountInfoDouble(ACCOUNT_EQUITY);
   long login         = AccountInfoInteger(ACCOUNT_LOGIN);
   string currency    = AccountInfoString(ACCOUNT_CURRENCY);
   string company     = AccountInfoString(ACCOUNT_COMPANY);

   int total = PositionsTotal();
   
   string json = "{";
   json += StringFormat("\"event\":\"batch_sync\",\"login\":%I64d,\"balance\":%.2f,\"equity\":%.2f,\"currency\":\"%s\",\"broker\":\"%s\",\"portfolio_id\":\"%s\",\"positions\":[",
      login, balance, equity, currency, company, InpPortfolioId
   );

   int posCount = 0;
   for(int i = 0; i < total; i++)
   {
      string posSymbol = PositionGetSymbol(i);
      ulong ticket = (ulong)PositionGetInteger(POSITION_TICKET);
      if(ticket == 0)
         ticket = PositionGetTicket(i);

      if(ticket > 0)
      {
         ulong magic = (ulong)PositionGetInteger(POSITION_MAGIC);
         if(InpMagicFilter != 0 && magic != InpMagicFilter)
            continue;

         string symbol       = PositionGetString(POSITION_SYMBOL);
         if(symbol == "") symbol = posSymbol;
         
         long posType        = PositionGetInteger(POSITION_TYPE);
         double volume       = PositionGetDouble(POSITION_VOLUME);
         double priceOpen    = PositionGetDouble(POSITION_PRICE_OPEN);
         double priceCurrent = PositionGetDouble(POSITION_PRICE_CURRENT);
         double sl           = PositionGetDouble(POSITION_SL);
         double tp           = PositionGetDouble(POSITION_TP);
         double profit       = PositionGetDouble(POSITION_PROFIT);
         double swap         = PositionGetDouble(POSITION_SWAP);
         datetime openTime   = (datetime)PositionGetInteger(POSITION_TIME);
         string comment      = PositionGetString(POSITION_COMMENT);

         string orderTypeStr = (posType == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         string timeStr      = TimeToString(openTime, TIME_DATE|TIME_SECONDS);

         if(posCount > 0) json += ",";
         json += StringFormat(
            "{\"ticket\":%I64d,\"symbol\":\"%s\",\"order_type\":\"%s\",\"lots\":%.2f,\"open_price\":%.5f,\"current_price\":%.5f,\"sl\":%.5f,\"tp\":%.5f,\"open_time\":\"%s\",\"comment\":\"%s\",\"profit\":%.2f,\"swap\":%.2f}",
            ticket, symbol, orderTypeStr, volume, priceOpen, priceCurrent, sl, tp, timeStr, comment, profit, swap
         );
         posCount++;
      }
   }

   json += "]}";
   SendJsonToWebhook(json);
}

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("[TradeJournal] TradeJournalSync EA Initialized.");
   PrintFormat("[TradeJournal] Target URL: %s | Portfolio: %s", InpWebhookURL, InpPortfolioId);
   
   SyncBatchAll();
   EventSetTimer(InpSyncInterval > 0 ? InpSyncInterval : 1);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("[TradeJournal] TradeJournalSync EA Removed.");
}

//+------------------------------------------------------------------+
//| Expert Timer function                                            |
//+------------------------------------------------------------------+
void OnTimer()
{
   SyncBatchAll();
}

//+------------------------------------------------------------------+
//| Expert Tick function (Realtime update on every price tick)       |
//+------------------------------------------------------------------+
void OnTick()
{
   datetime now = TimeCurrent();
   if(now - lastSyncTime >= 1)
   {
      lastSyncTime = now;
      SyncBatchAll();
   }
}

//+------------------------------------------------------------------+
//| TradeTransaction function: Catches real-time deals               |
//+------------------------------------------------------------------+
void OnTradeTransaction(
   const MqlTradeTransaction& trans,
   const MqlTradeRequest& request,
   const MqlTradeResult& result
)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      SyncBatchAll();
   }
}
