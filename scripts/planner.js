'use strict';

function useState(arg) {
  return React.useState(arg);
}

function Planner(props) {
  const [factory, setFactory] = useState([]);
  return (
    <div>
      <BuildingSelection factory={factory} setFactory={setFactory}/>
      <Summary factory={factory}/>
      <BuildingDetail factory={factory}/>
    </div>
  )
}

const buildingList = Object.entries(buildingMap).map(b => b[1]);

function BuildingSelection({factory, setFactory}) {
  const [selectedBuilding, setSelectedBuilding] = useState(buildingList[0]);
  const [selectedRecipe, setSelectedRecipe] = useState(getRecipes(buildingList[0])[0]);
  const [numBuildings, setNumBuildings] = useState(0);
  const [buildingCounter, setBuildingCounter] = useState(0);
  return (
    <div>
      <select key="building" value={selectedBuilding.name} onChange={e => setSelectedBuilding(buildingMap[e.target.value])}>
        {buildingList.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
      </select>
      <select key="recipe" value={selectedRecipe.name} onChange={e => setSelectedRecipe(selectedBuilding.recipes[e.target.value])}>
        {getRecipes(selectedBuilding).map(recipe =>
          <option key={recipe.name} value={recipe.name}>{recipe.name}: ({recipe.ingredients.map(i => i.rate + " " + i.item).join(', ')}) -&gt; ({recipe.products.map(i => i.rate + " " + i.item).join(', ')})</option>)
        }
      </select>
      <input type="text" value={numBuildings} onChange={e => setNumBuildings(sanitizePositiveNumber(e.target.value))}></input>
      <button onClick={() => {
        setBuildingCounter(buildingCounter + 1);
        setFactory(addBuilding(factory, {
          building: selectedBuilding,
          recipe: selectedRecipe,
          number: parseFloat(numBuildings),
          counter: buildingCounter,
        }));
      }}>Add Building</button>
    </div>
  );
}

function Summary({factory}) {
  const totals = factory.reduce((counters, item) => {
    console.log(item);
    item.recipe.ingredients.forEach(i => {
      if (!counters[i.item]) {
        counters[i.item] = 0;
      }
      counters[i.item] += (item.number * i.rate)
    });
    item.recipe.products.forEach(i => {
      if (!counters[i.item]) {
        counters[i.item] = 0;
      }
      counters[i.item] -= (item.number * i.rate)
    });
    return counters;
  }, {});
  console.log(totals);

  const inputs = Object.entries(totals)
      .filter(t => t[1] > 0)
      .map(t => <p key={t[0]}>{t[0]}: {formatNumber(t[1])}</p>);
  const outputs = Object.entries(totals)
      .filter(t => t[1] < 0)
      .map(t => <p key={t[0]}>{t[0]}: {formatNumber(-t[1])}</p>);

  return (
    <div>
      <h1>Summary</h1>
      <h3>Inputs</h3>
      {inputs.length == 0 ? <p>None</p> : inputs}
      <h3>Outputs</h3>
      {outputs.length == 0 ? <p>None</p> : outputs}
    </div>
  );
}

function BuildingDetail({factory}) {
  return (
    <div>
      <h1>Details</h1>
      {factory.map(b => {
        return (<div key={b.counter}>
          <h3>{b.number} {b.building.name}</h3>
          <h4>Ingredients</h4>
          {b.recipe.ingredients.map(i => <p key={i.item}>{formatNumber(i.rate * b.number)} {i.item}</p>)}
          <h4>Products</h4>
          {b.recipe.products.map(i => <p key={i.item}>{formatNumber(i.rate * b.number)} {i.item}</p>)}
        </div>);
      })}
    </div>
  );
}

function addBuilding(factory, newBuilding) {
  const newFactory = [...factory];
  newFactory.push(newBuilding);
  return newFactory;
}

function getRecipes(building) {
  return Object.entries(building.recipes).map(keyValue => keyValue[1]);
}

function sanitizePositiveNumber(numberString) {
  const onlyAllowedChars = numberString.replace(/[^0-9.]/, '');
  const firstPeriod = onlyAllowedChars.indexOf('.');
  if (firstPeriod === -1) {
    return onlyAllowedChars;
  }
  const lastPeriod = onlyAllowedChars.lastIndexOf('.');
  if (firstPeriod === lastPeriod) {
    return onlyAllowedChars;
  }
  return onlyAllowedChars.substring(0, lastPeriod);
}

function formatNumber(number) {
  return number.toFixed(4).replace(/(\.0000)|(0+$)/, '')
}

const domContainer = document.getElementById('planner');
ReactDOM.render(<Planner/>, domContainer);