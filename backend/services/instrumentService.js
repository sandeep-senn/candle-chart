let instruments = [];

export const setInstruments = (data) => {
    instruments = data;
    console.log(`[InstrumentService] Unified Store: Set ${instruments.length} instruments.`);
};

export const getInstruments = () => {
    return instruments;
};

/**
 * Loads a map of instrument_token -> tradingsymbol for Ticker mapping
 */
export async function loadSpotTokens(kite) {
    try {
        console.log("[InstrumentService] Loading spot tokens for Ticker mapping...");
        const [nse, bse] = await Promise.all([
            kite.getInstruments("NSE"),
            kite.getInstruments("BSE")
        ]);

        const map = {};
        [...nse, ...bse].forEach(i => {
            map[i.instrument_token] = i.tradingsymbol;
        });

        console.log(`[InstrumentService] Mapped ${Object.keys(map).length} tokens.`);
        return map;
    } catch (err) {
        console.error("[InstrumentService] Failed to load spot tokens:", err);
        return {};
    }
}
