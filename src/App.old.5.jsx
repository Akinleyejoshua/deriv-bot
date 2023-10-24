import { useEffect, useState } from 'react'
import './App.css'
import DerivAPI from "./deriv/DerivAPI";
import { api2, connection } from "./deriv";

function App() {
  const [state, setState] = useState({
    token: "1C1Qo1372JjoJ1w",
    appId: 40003,
    balance: 0,
    currency: "USD",
    msg: "",
    msgType: "",
    tick: 0,
    prevTick: 0,
    tickH: [],
    contractId: null,
    price: 2000,
    lot: 100,
    resell: null,
    symbol: "1HZ10V",
    // symbol: "frxEURUSD",
    trend: "neutral",
    duration: 1,
    unit: "t",
    done: false,
  })

  let [time, setTime] = useState(null);

  const handleState = (name, val) => {
    setState(prevState => ({
      ...prevState,
      [name]: val
    }))
  }

  const { appId, price, lot } = state;

  const api = new DerivAPI({ app_id: appId });

  const authorize = async () => {
    handleState("msg", "loading");
    handleState("msgType", "load");

    try {

      const account = await api.account(state.token);

      const { balance } = account;
      handleState("balance", balance.display);
      handleState("currency", balance.currency);
      handleState("msg", "");
      handleState("msgType", "");

      balance.onUpdate(() => handleState("balance", balance.display))

    } catch (err) {
      // console.log(err)
      handleState("msg", err.message);
      handleState("msgType", "danger");

    }
  }
  const ticks = () => api.basic.ticks({ ticks: state.symbol, subscribe: 1 })
  const tickStream = () => api2.subscribe({ ticks: state.symbol });

  const getTick = async () => {
    try {
      const price = await ticks()
      handleState("prevTick", price.tick.quote)
      handleState("done", false)

    } catch (err) {
      handleState("msg", err.message);
      handleState("msgType", "danger");
    }

  }

  const [tickHis, setTickHis] = useState([])

  const getTicks = async () => {
    await tickStream();

    connection.addEventListener("message", async (res) => {
      const data = JSON.parse(res.data).tick;
      // console.log(data);
      setTickHis(prev => ([...prev, data.quote]))
      handleState("tick", data?.quote)
    })
  }

  const cancleContract = async (id) => {

    try {
      await api.basic.authorize(state.token);

      const contract = await api.basic.cancel({ cancel: id });
      // console.log(contract);

    } catch (err) {
      console.log(err)

    }
  }

  const buy = async (priceVal) => {

    try {

      await api.basic.authorize(state.token);

      const buy = await api.basic.buy({
        price: priceVal,
        parameters: {
          amount: lot,
          duration: state.duration,
          basis: "stake",
          currency: state.currency,
          duration_unit: state.unit,
          contract_type: "CALL",
          symbol: state.symbol
        }
      })
      getTick();
      if (buy.msg_type === "buy") {
        api.basic.disconnect();

        if (state.tick < state.prevTick) cancleContract(buy.buy.contract_id);

      }

    } catch (err) {
      // console.log(err)

    }

  }
  const sell = async (priceVal) => {
    await api.basic.authorize(state.token);

    try {

      const buy = await api.basic.buy({
        price: priceVal,
        parameters: {
          amount: lot,
          duration: state.duration,
          basis: "stake",
          currency: state.currency,
          duration_unit: state.unit,
          contract_type: "PUT",
          symbol: state.symbol
        }
      })

      getTick();

      if (buy.msg_type === "buy") {
        api.basic.disconnect();
        if (state.tick > state.prevTick) cancleContract(buy.buy.contract_id);
      }

    } catch (err) {
      // console.log(err)
    }

  }

  function determineTickDirection(tickIndex) {
    if (tickIndex <= 0) {
      return 'Initial tick';
    }

    const tradeTicks = tickHis;

    const currentTick = state.tick;
    const previousTick = tradeTicks[tickIndex - 1];

    handleState("prevTick", previousTick)

    if (currentTick > previousTick) {
      buy(currentTick);
      return 'up';
    } else if (currentTick < previousTick) {
      sell(currentTick);
      return 'down';
    } else {
      return 'unchanged';
    }
  }

  const analysis = async () => {
    const index = tickHis.indexOf(state.tick)
    const tick = determineTickDirection(index)
    handleState("trend", tick)
    return tick;
  }

  const automate = async () => {
    await getTicks();
  }

  const stop = async () => {
    handleState("msg", "stopping")

    connection.removeEventListener("message", () => {
      handleState("msg", "stopped")
    }, false)
    tickStream().unsubscribe()
    await api2.disconnect()
  }

  connection.addEventListener("message", (res) => {
    const data = JSON.parse(res.data);
    
    analysis();
    setTimeout(stop, 50000)


  })

  useEffect(() => {

    authorize();
    getTicks()


  }, [])


  return (
    <>
      <header>
        <nav>
          <div className="navbrand">
            <a href="/">Deriv Bot</a>
          </div>
          <div className="bal">
            <h4>{state.currency} {state.balance}</h4>
          </div>
        </nav>
      </header>
      <p className={`msg ${state.msgType}`}>{state.msg}</p>
      <main className='grid'>
        <div className="col inputs">
          {/* <input type="text" placeholder={"App Id (1234)"} onChange={e => handleState("appId", e.target.value)} /> */}
          <input type="text" placeholder={"Price (USD)"} onChange={e => handleState("lot", e.target.value)} />
          <input type="text" placeholder={"Duration"} onChange={e => handleState("duration", e.target.value)} />
          <input type="text" placeholder={"Unit"} onChange={e => handleState("unit", e.target.value)} />
        </div>
        {(price !== null && price !== "") && <div className="row actions grid">
          <div className="row buy-sell">
            {/* <button className='buy-btn' onClick={() => buy(state.tick)}>Buy
              <div className="space"></div>
              <p className='dim'>
                {state.currency} {lot}
              </p>
            </button>
            <button className='sell-btn' onClick={() => sell(state.tick)}>Sell
              <div className="space"></div>
              <p className='dim'>
                {state.currency} {lot}
              </p>
            </button> */}
          </div>
          <div className="grid">
            <button className='auto-btn' onClick={automate}>Automate Bot</button>
          </div>
        </div>

        }

        <div className="ticks">
          Current price - {state.tick}
          <br />
          Placed Price - {state.prevTick}
          <br />
          Trend - {state.trend}
        </div>

      </main>
    </>
  )
}

export default App
