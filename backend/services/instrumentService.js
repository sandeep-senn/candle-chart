import axios from "axios";

let instruments = [];

export const setInstruments = (data) => {
    instruments = data;
    console.log(`[InstrumentService] Unified Store: Set ${instruments.length} instruments.`);
};

export const getInstruments = () => {
    return instruments;
};

export const getInstrumentBySymbol = (symbol) => {
    return instruments.find(i => i.symbol === symbol || i.name === symbol);
};

export const findTokenBySymbol = (symbol) => {
    const inst = getInstrumentBySymbol(symbol);
    return inst ? inst.token : null;
};


/**
 * Loads Angel One instruments
 */
export async function loadAngelTokens() {
    try {
        console.log("[InstrumentService] Loading Angel One tokens...");
        const response = await axios.get("https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json");
        const data = response.data;

        const map = {};
        data.forEach(i => {
            // Key by token for quick lookup in WebSocket
            map[i.token] = i.tradingsymbol;
        });

        // Also return the raw data array for searching
        return { map, raw: data };
    } catch (err) {
        console.error("[InstrumentService] Failed to load Angel One tokens:", err);
        return { map: {}, raw: [] };
    }
}
