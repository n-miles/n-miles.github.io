'use strict';

function useState(arg) {
  return React.useState(arg);
}

function Planner(props) {
  const [factory, setFactory] = useState([]);
  const factoryMutator = (f) => {
    const newFactory = [...factory];
    f(newFactory);
    setFactory(newFactory);
  }
  return (
    <div className="planner-container">
      <Summary factory={factory}/>
      <BuildingDetail factory={factory} factoryMutator={factoryMutator}/>
    </div>
  )
}

const buildingList = Object.entries(buildingMap).map(b => b[1]).sort((b1, b2) => b1.name.localeCompare(b2.name));

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

  const inputs = Object.entries(totals)
      .filter(t => t[1] > 0)
      .map(t =>
        <li key={t[0]} className="summary-input-item">
          <span className="summary-input-item-name">{t[0]}</span><span className="summary-input-item-quantity">{formatNumber(t[1])}/m</span>
        </li>);
  const outputs = Object.entries(totals)
      .filter(t => t[1] < 0)
      .map(t =>
        <li key={t[0]} className="summary-output-item">
          <span className="summary-output-item-name">{t[0]}</span><span className="summary-input-item-quantity">{formatNumber(-t[1])}/m</span>
        </li>);

  return (
    <div className="summary-container">
      <p className="summary-banner">Summary</p>
      <p className="summary-input-label">Inputs</p>
      <ul className="summary-input-list">
        {inputs.length == 0 ? <li>None</li> : inputs}
      </ul>
      <p className="summary-output-label">Outputs</p>
      <ul className="summary-output-list">
        {outputs.length == 0 ? <li>None</li> : outputs}
      </ul>
    </div>
  );
}

function BuildingDetail({factory, factoryMutator}) {
  return (
    <div className="details-container">
      {factory.map((group, index) => {
        const groupMutator = mutation => {
          factoryMutator(factoryCopy => {
            const groupCopy = Object.assign({}, group);
            mutation(groupCopy);
            factoryCopy[index] = groupCopy;
          })
        };
        const deleteGroup = () => {
          factoryMutator(factoryCopy => {
            factoryCopy.splice(index, 1);
          })
        };
        return (
          <BuildingGroup key={group.counter} group={group} groupMutator={groupMutator} factoryMutator={factoryMutator} deleteGroup={deleteGroup} />
        );
      })}
      <AddGroupButton factoryMutator={factoryMutator}/>
    </div>
  );
}

function BuildingGroup({group, groupMutator, deleteGroup}) {

  const [recipeSearchText, setRecipeSearchText] = useState('');
  const [hasFocus, setHasFocus] = useState(false);

  const lowerCaseSearchText = recipeSearchText.toLowerCase();
  
  const updateBuilding = event => groupMutator(newGroup => {
    newGroup.building = buildingMap[event.target.value];
    newGroup.recipe = getRecipes(newGroup.building)[0];
  });
  const updateBuildingNumber = event => groupMutator(newGroup => {
    newGroup.number = sanitizePositiveNumber(event.target.value);
  });

  const matchingRecipes = hasFocus && getRecipes(group.building)
      .filter(r => r.name.toLowerCase().includes(lowerCaseSearchText)
              || r.ingredients.some(i => i.item.toLowerCase().includes(lowerCaseSearchText))
              || r.products.some(i => i.item.toLowerCase().includes(lowerCaseSearchText))
      );

  return (
    <div className="building-group-container">
      <DeleteBuildingButton deleteGroup={deleteGroup}/>
      <select key="building" value={group.name} onChange={updateBuilding}>
        {buildingList.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
      </select>
      #
      <input type="text" value={group.number} onChange={updateBuildingNumber}></input>
      <br/>
      Recipe Search:
      <input type="text" value={recipeSearchText}
        onChange={e => setRecipeSearchText(e.target.value)}
        onFocus={e => setHasFocus(true)}
        onBlur={e => setTimeout(() => setHasFocus(false), 100)}></input>
      {
        hasFocus && 
          <div className="recipe-results">
            {matchingRecipes.length == 0 ? "No results." :
              <ul className="recipe-search-results-list">
                {matchingRecipes.map(r =>
                  <li key={r.name} className="recipe-search-result" onClick={() => groupMutator(g => g.recipe = r)}>
                    {r.name}
                    <br/>
                    ({r.ingredients.map(i => `${i.rate}/m ${i.item}`).join(', ')}) -&gt; ({r.products.map(i => `${i.rate}/m ${i.item}`).join(', ')})
                  </li>
                )}
              </ul>
            }
          </div>
      }
      <p className="recipe-details-name">{group.recipe.name}</p>
      <div className="recipe-details">
        <div className="recipe-details-inputs">
          {group.recipe.ingredients.map(i =>
            <p key={i.item}>
              <span className="recipe-details-item-name">{i.item}</span>
              <span className="recipe-details-item-number">{formatNumber(i.rate * group.number)}/m</span>
            </p>)}
        </div>
        <div className="recipe-arrow">--&gt;</div>
        <div className="recipe-details-outputs">
          {group.recipe.products.map(i =>
            <p key={i.item}>
              <span className="recipe-details-item-name">{i.item}</span>
              <span className="recipe-details-item-number">{formatNumber(i.rate * group.number)}/m</span>
            </p>)}
        </div>
      </div>
    </div>
  );
}

function DeleteBuildingButton({deleteGroup}) {
  return (
    <button className="delete-button" onClick={deleteGroup}>X</button>
  );
}

function AddGroupButton({factoryMutator}) {
  const [counter, setCounter] = useState(0);
  return (
    <button onClick={() => {
      factoryMutator((f) => f.push(defaultGroup(counter)));
      setCounter(counter + 1);
    }}>Add Group</button>
  );
}

function addBuilding(factory, newBuilding) {
  const newFactory = [...factory];
  newFactory.push(newBuilding);
  return newFactory;
}

function defaultGroup(counter) {
  const building = buildingList[0];
  return {
    building: building,
    recipe: getRecipes(building)[0],
    number: 1,
    counter: counter,
  };
}

// todo this is slow
function getRecipes(building) {
  return Object.entries(building.recipes).map(keyValue => keyValue[1]).sort((r1, r2) => r1.name.localeCompare(r2.name));
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