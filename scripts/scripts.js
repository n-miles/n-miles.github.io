function calculate(item, rate) {
    let tree = buildTree(item, rate)
    let totals = {}

    getTotals(tree, totals)

    let totalArray = []
    for (item in totals) {
        var constructorCount = 0
        let recipe = getRecipe(item)
        if (recipe) {
            constructorCount = totals[item] / getRecipe(item).products[0].rate
        }

        totalArray.push({
            item: item,
            total: totals[item],
            constructors: constructorCount
        })
    }

    let result = {
        tree: tree,
        totals: totalArray,
    };

    return result
}

function buildTree(product, itemsPerMinute) {
    let recipe = getRecipe(product)
    if (!recipe) {
        return {
            product: product,
            rate: itemsPerMinute,
            ingredients: []
        }
    }

    let recipeScalar = itemsPerMinute / recipe.products[0].rate
    
    return {
        product: product,
        rate: itemsPerMinute,
        ingredients: recipe.ingredients.map(i => buildTree(i.item, i.rate * recipeScalar))
    }
}

function getRecipe(product) {
    let choices = recipeTree[product]
    if (!choices) {
        return null
    } else {
        return choices[0]
    }
}

function getTotals(tree, totals) {
    if (!tree) {
        return
    }

    let current = totals[tree.product]
    if (!current) {
        current = 0
    }
    totals[tree.product] = current + tree.rate

    tree.ingredients.forEach(i => {
        getTotals(i, totals)
    });
}

const WIDTH = 800
const HEIGHT = 400
const NODE_PADDING = 20

function renderTree(tree) {

    let links = []
    populateLinks(tree.tree, links)

    let sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(NODE_PADDING)
        .extent([[50, 5], [WIDTH - 100, HEIGHT - 20]])
        .nodeId(d => d.item)
        .nodes(tree.totals)
        .links(links)

    let graph = sankey()

    renderSankey(sankey, graph)
}

function renderSankey(sankey, graph) {
    fixLinkOrder(graph.nodes)

    d3.select("svg")
        .remove()
    
    const svg = d3.select("#svgcontainer")
        .append("svg")
        .attr("viewBox", [0, 0, WIDTH, HEIGHT])
    
    let scale = d3.scaleOrdinal(d3.schemeTableau10)
    let getNodeColor = node => scale(node.item)
    let getLinkColor = link => scale(link.source.item)

    svg.append("g")
        .selectAll("g")
        .data(graph.links)
        .join("g")
        .append("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", getLinkColor)
            .attr("fill", "none")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", d => Math.max(2, d.width))
        .append("title")
            .text(d => `${d.value} ${d.source.item} -> ${d.target.item}`)

    let nodes = svg.append("g")
        .selectAll("rect")
        .data(graph.nodes)

    nodes.join("rect")
            .attr("transform", d => `translate(${d.x0} ${d.y0})`)
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", getNodeColor)
            .call(d3.drag()
                .subject(d => d)
                .on("drag", d => {
                    handleDrag(d)
                    sankey.update(graph)
                    renderSankey(sankey, graph)
                })
            )
        .append("title")
            .text(d => {
                let text = `${d.item}\n${format(d.total)}/m`
                if (d.constructors === 0) {
                    return text
                } else {
                    return text + `\n${format(d.constructors)} Buildings`
                }
            })
    
    nodes.join("text")
            .attr("transform", d => `translate(${d.x1 + 1} ${(d.y1 + d.y0) / 2})`)
            .attr("stroke", "none")
            .attr("x", 0)
            .attr("y", "-.2em")
            .attr("font-size", ".5em")
            .text(d => `${d.item}`)
    
    nodes.join("text")
            .attr("transform", d => `translate(${d.x1 + 1} ${(d.y1 + d.y0) / 2})`)
            .attr("stroke", "none")
            .attr("x", 0)
            .attr("y", "1em")
            .attr("font-size", ".5em")
            .text(d => {
                let text = `${format(d.total)}/m`
                if (d.constructors === 0) {
                    return text
                } else {
                    return text + ` (${format(d.constructors)} Buildings)`
                }
            })
}

function populateLinks(tree, links) {
    tree.ingredients.forEach(i => {
        var found = false
        for (var j = 0; j < links.length; j++) {
            if (links[j].source === i.product && links[j].target === tree.product) {
                links[j].value += i.rate
                found = true
                break
            }
        }
        if (!found) {
            links.push({
                source: i.product,
                target: tree.product,
                value: i.rate
            })
        }
        populateLinks(i, links)
    })
}

// makes it so nodes that don't have to cross unless necessary
function fixLinkOrder(nodes) {
    nodes.forEach(n => {
        n.targetLinks.sort((l1, l2) => l1.y0 > l2.y0 ? 1 : l1.y0 < l2.y0 ? -1 : 0)
        n.sourceLinks.sort((l1, l2) => l1.y1 > l2.y1 ? 1 : l1.y1 < l2.y1 ? -1 : 0)
    })
}

// formats integers with no decimals, decimals get 2 places
function format(number) {
    return number % 1 == 0 ? number : number.toFixed(2)
}

function handleDrag(node) {
    let deltaY = d3.event.dy
    let deltaX = d3.event.dx
    // I don't know why these huge "jumps" happen but I have to ignore them
    if (deltaY > 50 || deltaY < -50 || deltaX > 50 | deltaX < -50) {
        return
    }
    
    node.y0 += deltaY
    node.y1 += deltaY

    node.x0 += deltaX
    node.x1 += deltaX
}

// Stage {
//     product,
//     rate,
//     ingredients: [
//         Stage...
//     ]
// }
