import { useEffect, useState } from 'react'
import './App.css'
import DerivAPI from "./deriv/DerivAPI";
import { connection } from "./deriv";

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
    contractId: null,
    price: 2000,
    lot: 1000,
    resell: null,
    symbol: "1HZ100V",

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
      console.log(err)
      handleState("msg", err.message);
      handleState("msgType", "danger");

    }
  }
  const ticks = () => api.basic.ticks({ ticks: state.symbol, subscribe: 1 })
  const tickStream = () => api.basic.subscribe({ ticks: state.symbol });


  const getTick = async () => {
    try {
      const price = await ticks()
      handleState("prevTick", price.tick.quote)
    } catch (err) {
      handleState("msg", err.message);
      handleState("msgType", "danger");
    }

  }

  const rate = 2500

  const getTicks = async () => {
    await tickStream();
    connection.addEventListener("message", (res) => {
      console.log(res.data)
    })

    setInterval(async () => {
      const price = await ticks()
      // console.log(price.tick)
      handleState("tick", price.tick.quote)
    }, rate)
  }

  const cancleContract = async (id) => {

    try {
      await api.basic.authorize(state.token);

      const contract = await api.basic.sell({ sell: id, price: lot * 1.5 });
      console.log(contract);
    
    } catch (err) {
      console.log(err)
    
    }
  }

  const updateContract = async (id) => {

    try {
      await api.basic.authorize(state.token);

      const contract = await api.basic.contractUpdate({ contract_update:1, contract_id: id,
        limit_order: {
          take_profit: state.tick
        }
      });
      console.log(contract);
    
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
          duration: 1,
          basis: "stake",
          currency: state.currency,
          duration_unit: "t",
          contract_type: "CALL",
          symbol: state.symbol
        }
      })

      console.log(buy)

      if (state.prevTick > state.tick) cancleContract(buy.buy.contract_id)


    } catch (err) {
      console.log(err)

    }

  }
  const sell = async (priceVal) => {
   
    try {
      await api.basic.authorize(state.token);

      const buy = await api.basic.buy({
        price: priceVal,
        parameters: {
          amount: lot,
          duration: 1,
          basis: "stake",
          currency: state.currency,
          duration_unit: "t",
          contract_type: "PUT",
          symbol: state.symbol
        }
      })

      if (state.prevTick < state.tick) cancleContract(buy.buy.contract_id)
  
    } catch (err) {
      console.log(err)
    }

  }


  const analysis = async () => {
    getTick();
    const price = state.tick;
    const prevPrice = state.prevTick;

    if (price < prevPrice) buy(price);
    if (price > prevPrice) sell(price)

  }

  const automate = () => {
    setInterval(analysis, rate)
  }

  useEffect(() => {

    authorize();
    getTicks()
    // buy(8000)
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
          <input type="text" placeholder={"Price (USD)"} onChange={e => handleState("price", e.target.value)} />
        </div>
        {(price !== null && price !== "") && <div className="row actions grid">
          <div className="row buy-sell">
            <button className='buy-btn' onClick={() => buy(state.tick)}>Buy
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
            </button>
          </div>
          <div className="grid">
            <button className='auto-btn' onClick={automate}>Automate Bot</button>
          </div>
          <button className='tick-btn' onClick={getTick}>Print Ticks</button>
        </div>

        }

        <div className="ticks">
          Current price - {state.tick}
          <br />
          Placed Price - {state.prevTick}
          <br />
          Contract ID - {state.contractId}

        </div>

      </main>
    </>
  )
}

export default App
