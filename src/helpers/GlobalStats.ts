import { EvmOnEventContext, GlobalStats } from "envio";

export const globalStatsId = "global";

export const defaultGlobalStats: GlobalStats = {
  id: globalStatsId,
  protocolFees: 0n,
}

export const createGlobalStats = async (
    context: EvmOnEventContext,    
    overrides?: Partial<GlobalStats>
  ) => {  
    const globalStats: GlobalStats = {      
      ...defaultGlobalStats,
      ...overrides, 
    }  
    context.GlobalStats.set(globalStats);
  }

export const updateGlobalStats = async (
    context: EvmOnEventContext,
    globalStats: GlobalStats,
    overrides?: Partial<GlobalStats>
  ) => {         
    context.GlobalStats.set({
        ...globalStats,
        ...overrides, 
      });
  } 

export const createOrUpdateGlobalStats = async (context: EvmOnEventContext, overrides?: Partial<GlobalStats>) => {
  let globalStats: GlobalStats | undefined = await context.GlobalStats.get(globalStatsId);
  if (globalStats) {
    await updateGlobalStats(context, globalStats, overrides);
  } else {
    await createGlobalStats(context, overrides);
  }
}