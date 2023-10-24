import { useEffect, useState } from 'react'
import './App.css'
import { api } from './deriv'
import DerivAPI from "./deriv/DerivAPI";
import {find} from "rxjs/operators"

function App() {
  const [state, setState] = useState({
    token: "1C1Qo1372JjoJ1w",
    appId: 39992,
    balance: 0,
    currency: "USD",
    msg: "",
    msgType: "",
    lot: 0.3,
  })

  const handleState = (name, val) => {
    setState(prevState => ({
      ...prevState,
      [name]: val
    }))
  }

  const { appId, lot } = state;

  const api = new DerivAPI({ app_id: appId });


  const authorize = async () => {
    handleState("msg", "loading");
    handleState("msgType", "load");

    try {
      const account = await api.account(state.token);
      const { balance, currency } = account;
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

  const createContract = async () => {
    handleState("msg", "loading");
    handleState("msgType", "load");
    try{
      const contract = await api.contract({
        contract_type: 'CALL',
        currency: state.currency,
        amount: 10,
        duration: 15,
        duration_unit: 'm',
        symbol: 'frxAUDUSD',
        basis: 'stake',
      });
  
      contract.onUpdate(({ status, payout, stake, bid_price }) => {
        switch (status) {
          case 'proposal':
            return console.log(
              `Current payout: ${payout.currency} ${payout.display}`,
            );
          case 'stake':
            return console.log(
              `Current payout: ${stake.currency} ${stake.display}`,
            );
          case 'open':
            return console.log(
              `Current bid price: ${bid_price.currency} ${bid_price.display}`,
            );
          default:
            break;
        }
      });

      // Wait until payout is greater than USD 19
      const expected_stake = 19
      await contract.onUpdate()
        .pipe(find(({ stake }) => stake.value >= expected_stake)).toPromise();
  
      const buy = await contract.buy();
  
      console.log(`Buy price is: ${buy.price.currency} ${buy.price.display}`);
  
      // Wait until the contract is sold
      await contract.onUpdate().pipe(find(({ is_sold }) => is_sold)).toPromise();
  
      const { profit, status } = contract;
  
      console.log(`You ${status}: ${profit.currency} ${profit.display}`);
      handleState("msg", "");
      handleState("msgType", "");
    } catch (err) {
      console.log(err)
      handleState("msg", err.message);
      handleState("msgType", "danger");
    }
    
  }

  useEffect(() => {

    authorize();


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
      <main>
        <button onClick={createContract}>Create Contract</button>
      </main>
    </>
  )
}

export default App
