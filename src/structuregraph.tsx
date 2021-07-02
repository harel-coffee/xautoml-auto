import React from "react";
import * as d3 from "d3";
import {HierarchyNode, HierarchyPointNode, TreeLayout} from "d3";
import {Animate} from "react-move";
import {easeExpInOut} from "d3-ease";
import {NodeDetails, StructureGraphNode} from "./model";

interface StructureGraphProps {
    data: StructureGraphNode;
}

interface StructureGraphState {
    nodes: CollapsibleHierarchyPointNode<StructureGraphNode>;
    source: CollapsibleHierarchyPointNode<StructureGraphNode>;
}

interface CollapsibleHierarchyNode<Datum> extends HierarchyNode<Datum> {
    _children?: this[];
}

interface CollapsibleHierarchyPointNode<Datum> extends HierarchyPointNode<Datum> {
    _children?: this[];
}

interface StructureGraphElementProps {
    source: CollapsibleHierarchyPointNode<StructureGraphNode>;
    node: CollapsibleHierarchyPointNode<StructureGraphNode>;
    onClickHandler?: (d: CollapsibleHierarchyPointNode<StructureGraphNode>) => void;
}

const NODE_HEIGHT = 60;
const NODE_WIDTH = 175;

class GraphNode extends React.Component<StructureGraphElementProps, any> {

    constructor(props: StructureGraphElementProps) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }

    private handleClick() {
        if (this.props.onClickHandler) {
            this.props.onClickHandler(this.props.node);
        }
    }

    private static determineState(details: NodeDetails) {
        const selected = details.selected ? 'selected' : ''

        if (!details.failure_message)
            return selected;
        if (details.failure_message.startsWith('Duplicate'))
            return `${selected} node-duplicate`;
        if (details.failure_message === 'Ineffective')
            return `${selected} node-duplicate`;
        if (details.failure_message === 'Crashed')
            return `${selected} node-crashed`;
        if (details.failure_message === 'Unvisited')
            return `${selected} node-unvisited`;
        return ''
    }

    render() {
        const node = this.props.node;
        const parent = node.parent ? node.parent : this.props.source;
        const data = node.data;
        const details = data.getDetails();

        const className = GraphNode.determineState(details);

        return (
            <Animate
                start={{x: parent.x, y: parent.y, opacity: 0, r: 1e-6}}
                update={{x: [node.x], y: [node.y], opacity: [1], r: [10], timing: {duration: 750, ease: easeExpInOut}}}
                enter={{x: [node.x], y: [node.y], opacity: [1], r: [10], timing: {duration: 750, ease: easeExpInOut}}}
            >{({x: x, y: y, opacity: opacity, r: r}) =>
                <g className={'node'} transform={`translate(${y},${x})`} onClick={this.handleClick}>
                    <foreignObject x={0} y={-NODE_HEIGHT / 2} width={NODE_WIDTH} height={NODE_HEIGHT}>
                        <div className={`node-content ${className}`}>
                            <h3>{data.label} ({data.id})</h3>
                            <div className={'node-details'}>
                                <div>{details.failure_message ? details.failure_message : 'Reward: ' + (details.reward / details.visits).toFixed(3)}</div>
                                <div>Visits: {details.visits}</div>
                                {Array.from(details.policy.keys()).map(k =>
                                    <div key={k}>{`${k}: ${details.policy.get(k).toFixed(3)}`}</div>)
                                }
                            </div>
                        </div>
                    </foreignObject>
                </g>
            }
            </Animate>
        )
    }
}

class GraphEdge extends React.Component<StructureGraphElementProps, any> {

    constructor(props: StructureGraphElementProps) {
        super(props);
    }

    render() {
        const node = this.props.node;
        const parent = node.parent ? node.parent : this.props.source;
        const details = node.data.getDetails();

        return (
            <Animate
                start={{
                    source: {x: parent.x, y: parent.y + NODE_WIDTH},
                    target: {x: parent.x, y: parent.y}
                }}
                update={{
                    source: {x: [parent.x], y: [parent.y + NODE_WIDTH]},
                    target: {x: [node.x], y: [node.y]},
                    timing: {duration: 750, ease: easeExpInOut}
                }}
                enter={{
                    source: {x: [parent.x], y: [parent.y + NODE_WIDTH]},
                    target: {x: [node.x], y: [node.y]},
                    timing: {duration: 750, ease: easeExpInOut}
                }}
            >{({source: source, target: target}) =>
                <path className={'link'} strokeWidth={details.selected ? 3 : 1} d={
                    d3.linkHorizontal().x(d => d[1]).y(d => d[0])({
                        source: [source.x, source.y],
                        target: [target.x, target.y]
                    })}/>
            }
            </Animate>
        )
    }
}

export class StructureGraphComponent extends React.Component<StructureGraphProps, StructureGraphState> {

    private readonly containerRef: React.RefObject<SVGSVGElement>;
    private readonly layout: TreeLayout<StructureGraphNode>;
    private readonly margin: number;

    constructor(props: StructureGraphProps) {
        super(props);
        this.containerRef = React.createRef<SVGSVGElement>();
        this.margin = 20;
        this.layout = d3.tree<StructureGraphNode>().size([1, 1]);
        this.state = {nodes: undefined, source: undefined};

        this.click = this.click.bind(this);
    }

    componentDidMount() {
        // Crude hack to actually wait for base container to be rendered in Jupyter
        window.setTimeout(() => {
            const nodes: CollapsibleHierarchyNode<StructureGraphNode> = d3.hierarchy(this.props.data, d => d.children);
            StructureGraphComponent.collapseAll(nodes);

            const root = this.layout(nodes)
            this.setState({nodes: root, source: root});
        }, 500)
    }

    private static collapseAll(d: CollapsibleHierarchyNode<StructureGraphNode>) {
        if (d.children) {
            d.children.forEach(d2 => this.collapseAll(d2))
            StructureGraphComponent.collapseNode(d)
        }
    }

    private static collapseNode(d: CollapsibleHierarchyNode<StructureGraphNode>) {
        const [unvisited, visited] = d.children.reduce(([unvisited, visited], child) => {
            const details = child.data.getDetails()
            return details.failure_message === 'Unvisited' ? [[...unvisited, child], visited] : [unvisited, [...visited, child]];
        }, [[], []]);
        d._children = unvisited
        if (visited.length > 0)
            d.children = visited
        else
            d.children = undefined
    }

    private click(node: CollapsibleHierarchyPointNode<StructureGraphNode>) {
        if (!node.children && !node._children) {
            // No children
            return;
        } else if (node._children?.length === 0) {
            // Node is expanded
            StructureGraphComponent.collapseNode(node);
        } else {
            // Node is collapsed
            node.children = node.children ? node.children.concat(node._children) : node._children;
            node._children = [];
        }
        this.setState({nodes: this.layout(this.state.nodes), source: node});
    }

    private calculateHeight(root: CollapsibleHierarchyNode<StructureGraphNode>): number {
        if (!root) {
            return 100;
        }

        const nodeCount = new Array<number>(Math.max(...root.descendants().map(d => d.depth)) + 1).fill(0);
        root.descendants().map(d => nodeCount[d.depth]++);
        const maxNodes = Math.max(...nodeCount);
        return maxNodes * (NODE_HEIGHT + this.margin) + 2 * this.margin;
    }

    render() {
        const newHeight = this.calculateHeight(this.state.nodes);
        const currentHeight = this.containerRef.current ?
            Number.parseFloat(this.containerRef.current.getAttribute('height')) : 100;
        if (currentHeight > newHeight) {
            window.setTimeout(() => {
                this.containerRef.current.setAttribute('height', newHeight.toString());
            }, 500);
        } else {
            this.containerRef.current?.setAttribute('height', newHeight.toString());
        }

        const nodes = this.state.nodes ? (this.state.nodes.descendants() as CollapsibleHierarchyPointNode<StructureGraphNode>[])
            .map(d => {
                d.y = d.depth * (NODE_WIDTH + 75);
                d.x = d.x * (newHeight - 2 * this.margin);
                return d;
            }) : [];

        return (
            <svg className={'base-container'} ref={this.containerRef}>
                {this.state.nodes && <g transform={`translate(${this.margin},${this.margin})`}>
                    {nodes.map(d => <GraphEdge key={d.data.id} source={this.state.nodes} node={d}/>)}
                    {nodes.map(d => <GraphNode key={d.data.id} source={this.state.nodes} node={d}
                                               onClickHandler={this.click}/>)}
                </g>}
            </svg>
        )
    }
}