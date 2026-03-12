let instruments = [];

export const setInstruments = (data) => {
    instruments = data;
    console.log(`[InstrumentStore] Set ${instruments.length} instruments.`);
};

export const getInstruments = () => {
    return instruments;
};
