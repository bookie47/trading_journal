//+------------------------------------------------------------------+
//|                                           TradeJournalSync.mq5   |
//|                        Copyright 2026, Trading Journal PWA       |
//|                                   https://trading-journal.app   |
//+------------------------------------------------------------------+
#property copyright "Trading Journal PWA"
#property link      "https://trading-journal.app"
#property version   "2.00"
#property description "Auto-log CLOSED trades & Balance to Trading Journal System"

//--- Inputs
input group "=== Webhook Configuration ==="
input string   InpWebhookURL    = "https://trading-journal-two-ruddy.vercel.app/api/mt5/sync"; // Webhook URL
input string   InpApiKey        = "tradejournal_mt5_secret_key_2026";                          // API Secret Key
input string   InpPortfolioId   = "portfolio-demo-1";                                         // Target Portfolio ID (Leave default for auto-detect)
input ulong    InpMagicFilter   = 0;                                                          // Magic Number (0 = All trades)

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
   ArrayResize(postData, ArraySize(postData) - 1);

   ResetLastError();
   int timeout = 5000;
   int res = WebRequest("POST", InpWebhookURL, headers, timeout, postData, resultData, resultHeaders);

   if(res == -1)
   {
      int err = GetLastError();
      PrintFormat("[TradeJournal] ❌ WebRequest failed! Code: %d (Please allow URL in Tools -> Options -> Expert Advisors)", err);
      return false;
   }
   else
   {
      string responseText = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
      PrintFormat("[TradeJournal] ✅ Trade logged to Journal (%d): %s", res, responseText);
      return (res == 200 || res == 201);
   }
}

//+------------------------------------------------------------------+
//| Sync Account Info (Balance, Equity, Currency)                    |
//+------------------------------------------------------------------+
void SendAccountSync()
{
   double balance     = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity      = AccountInfoDouble(ACCOUNT_EQUITY);
   long login         = AccountInfoInteger(ACCOUNT_LOGIN);
   string currency    = AccountInfoString(ACCOUNT_CURRENCY);
   string company     = AccountInfoString(ACCOUNT_COMPANY);
   string server      = AccountInfoString(ACCOUNT_SERVER);

   string json = StringFormat(
      "{\"event\":\"account_sync\",\"login\":%I64d,\"balance\":%.2f,\"equity\":%.2f,\"currency\":\"%s\",\"broker\":\"%s\",\"server\":\"%s\",\"portfolio_id\":\"%s\"}",
      login, balance, equity, currency, company, server, InpPortfolioId
   );

   SendJsonToWebhook(json);
}

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("[TradeJournal] TradeJournalSync (Closed Trades Only) Initialized.");
   PrintFormat("[TradeJournal] Webhook: %s", InpWebhookURL);
   
   SendAccountSync();
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("[TradeJournal] TradeJournalSync EA Removed.");
}

//+------------------------------------------------------------------+
//| TradeTransaction function: Catches ONLY CLOSED DEALS             |
//+------------------------------------------------------------------+
void OnTradeTransaction(
   const MqlTradeTransaction& trans,
   const MqlTradeRequest& request,
   const MqlTradeResult& result
)
{
   // Only trigger when a deal is closed (DEAL_ENTRY_OUT or DEAL_ENTRY_OUT_BY)
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(dealTicket > 0 && HistoryDealSelect(dealTicket))
      {
         long dealEntry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         
         // ONLY PROCESS CLOSED DEALS
         if(dealEntry != DEAL_ENTRY_OUT && dealEntry != DEAL_ENTRY_OUT_BY)
         {
            return;
         }

         long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
         ulong magic   = (ulong)HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
         
         if(InpMagicFilter != 0 && magic != InpMagicFilter)
            return;

         if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
            return;

         string symbol       = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
         double volume       = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
         double closePrice   = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
         double profit       = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
         double commission   = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
         double swap         = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
         datetime closeTime  = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
         string comment      = HistoryDealGetString(dealTicket, DEAL_COMMENT);
         ulong positionId    = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
         
         // Retrieve opening deal info
         double openPrice = closePrice;
         datetime openTime = closeTime;
         if(HistorySelectByPosition(positionId))
         {
            int totalDeals = HistoryDealsTotal();
            for(int i = 0; i < totalDeals; i++)
            {
               ulong inDeal = HistoryDealGetTicket(i);
               if(inDeal > 0 && HistoryDealGetInteger(inDeal, DEAL_ENTRY) == DEAL_ENTRY_IN)
               {
                  openPrice = HistoryDealGetDouble(inDeal, DEAL_PRICE);
                  openTime  = (datetime)HistoryDealGetInteger(inDeal, DEAL_TIME);
                  break;
               }
            }
         }

         // Deal type in DEAL_ENTRY_OUT is opposite of position side:
         // If close deal is SELL, the position was BUY (LONG)
         // If close deal is BUY, the position was SELL (SHORT)
         string sideStr = (dealType == DEAL_TYPE_SELL) ? "BUY" : "SELL";
         string openTimeStr  = TimeToString(openTime, TIME_DATE|TIME_SECONDS);
         string closeTimeStr = TimeToString(closeTime, TIME_DATE|TIME_SECONDS);
         
         double balance = AccountInfoDouble(ACCOUNT_BALANCE);
         double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
         long login     = AccountInfoInteger(ACCOUNT_LOGIN);
         string broker  = AccountInfoString(ACCOUNT_COMPANY);

         string json = StringFormat(
            "{\"event\":\"deal_close\",\"ticket\":%I64d,\"position_ticket\":%I64d,\"symbol\":\"%s\",\"order_type\":\"%s\",\"lots\":%.2f,\"open_price\":%.5f,\"close_price\":%.5f,\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,\"open_time\":\"%s\",\"close_time\":\"%s\",\"comment\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"login\":%I64d,\"broker\":\"%s\",\"portfolio_id\":\"%s\"}",
            dealTicket,
            positionId,
            symbol,
            sideStr,
            volume,
            openPrice,
            closePrice,
            profit,
            commission,
            swap,
            openTimeStr,
            closeTimeStr,
            comment,
            balance,
            equity,
            login,
            broker,
            InpPortfolioId
         );

         PrintFormat("[TradeJournal] 📝 Logging closed trade #%I64d for %s (Profit: %.2f USD)...", dealTicket, symbol, profit);
         SendJsonToWebhook(json);
      }
   }
}
