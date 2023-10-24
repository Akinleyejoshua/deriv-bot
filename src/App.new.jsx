import { useEffect, useState } from 'react'
import './App.css'
import DerivAPI from "./deriv/DerivAPI";
import { api2, connection } from "./deriv";

function App() {
  const [state, setState] = useState({
    token: "1C1Qo1372JjoJ1w",
    appId: 40003,
    session: "a1-g09QgXnl8IqQ7MH4T4RlFbjlKn5wj&cur3",
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
    trend: "neutral"
  })

  const [tickHis, setTickHis] = useState([])

  const handleState = (name, val) => {
    setState(prevState => ({
      ...prevState,
      [name]: val
    }))
  }

  const { appId, price, lot } = state;

  const api = new DerivAPI({ app_id: appId });

  function determineTickDirection(tickIndex) {
    if (tickIndex <= 0) {
      return 'Initial tick';
    }

    const tradeTicks = tickHis;

    const currentTick = state.tick;
    const previousTick = tradeTicks[tickIndex - 1];

    handleState("prevTick", previousTick)

    if (currentTick > previousTick) {
      // buy(currentTick)
      // buy(previousTick)
      return 'Tick is going up';
    } else if (currentTick < previousTick) {
      // sell(currentTick)
      return 'Tick is going down';
    } else {
      return 'Tick price is unchanged';
    }
  }

  const analysis = async () => {
    const index = tickHis.indexOf(state.tick)
    const tick = determineTickDirection(index)
    handleState("trend", tick)
    // console.log(tick, index)
  }

  connection.addEventListener("message", (res) => {
    const data = JSON.parse(res.data);
    analysis();
  })

  const automate = () => {

  }

  const auth = async () => await api.basic.authorize(state.token);


  useEffect(() => {
    const tickStream = () => api2.subscribe({ ticks: state.symbol });
    auth().then(() => {})

    connection.addEventListener("open", async () => {
      await tickStream();
    });

    connection.addEventListener("message", async (res) => {
      const data = JSON.parse(res.data);

      try {
        if (data.msg_type === "tick") {
          setTickHis(prev => ([...prev, data?.tick?.quote]))
          handleState("tick", data?.tick?.quote)
        }

        const acc = await api.account(state.token);
        const {balance, currency} = acc
        handleState("balance", balance.display)
        handleState("currency", currency)

      } catch (err) {
        console.log(err)
      }
    })

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
          <input type="text" placeholder={"App Id (1234)"} onChange={e => handleState("appId", e.target.value)} />
          <input type="text" placeholder={"App Token (dsaiodhdd9u39djpow)"} onChange={e => handleState("token", e.target.value)} />
          <input type="text" placeholder={"Price (USD)"} onChange={e => handleState("lot", e.target.value)} />
        </div>

        <div className="col">
          <button className='auto-btn' onClick={automate}>Automate Bot</button>
        </div>

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
