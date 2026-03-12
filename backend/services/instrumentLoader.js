/**
 * Utility to load spot tokens for Ticker mapping
 */
export async function loadSpotTokens(kite) {
    try {
        console.log("[InstrumentLoader] Loading spot tokens...");
        const [nse, bse] = await Promise.all([
            kite.getInstruments("NSE"),
            kite.getInstruments("BSE")
        ]);

        const map = {};
        [...nse, ...bse].forEach(i => {
            map[i.instrument_token] = i.tradingsymbol;
        });

        return map;
    } catch (err) {
        console.error("[InstrumentLoader] Error:", err);
        return {};
    }
}
