import {normalizeComponent} from "./util";

export type PolicyData = Map<string, number>
export type CandidateId = string
export type ConfigValue = number | string | boolean
export type Config = Map<string, ConfigValue>

export namespace Config {
    export class ConfigSpace {
        constructor(public readonly conditions: Condition[],
                    public readonly forbiddens: any[],
                    public readonly hyperparameters: HyperParameter[],
                    public readonly json_format_version: string,
                    public readonly python_module_version: string,
                    public readonly json: string) {

            this.conditions.forEach(con => {
                const parent = this.hyperparameters.filter(hp => hp.name === con.parent)[0]
                const child = this.hyperparameters.filter(hp => hp.name === con.child)[0]
                parent.subParameters.push(child)
            })
        }

        static fromJson(configSpace: string): ConfigSpace {
            const cs = JSON.parse(configSpace)
            const hyperparameters = (cs.hyperparameters as HyperParameter[]).map(hp => HyperParameter.fromJSON(hp))
            const conditions = (cs.conditions as Condition[]).map(con => Condition.fromJSON(con))

            return new ConfigSpace(conditions, cs.forbiddens, hyperparameters, cs.json_format_version, cs.python_module_version, configSpace)
        }

        getHyperparameters(name: string): HyperParameter[] {
            return this.hyperparameters
                .filter(hp => hp.name.split(':').filter(t => t === name).length > 0)
                .filter(hp => this.conditions.filter(con => con.child === hp.name).length === 0)
        }
    }

    export class Condition {
        constructor(public readonly parent: string,
                    public readonly child: string,
                    public readonly values: ConfigValue[]) {
        }

        static fromJSON(condition: any): Condition {
            const values = condition.hasOwnProperty('value') ? [condition['value']] : condition['values']
            return new Condition(condition.parent, condition.child, values)
        }
    }

    export class HyperParameter {

        constructor(public readonly name: string,
                    public readonly subParameters: HyperParameter[]) {
        }

        static fromJSON(hp: any): HyperParameter {
            if (hp['type'] === 'categorical')
                return CategoricalHyperparameter.fromJSON(hp as CategoricalHyperparameter)
            else if (hp['type'] === 'constant')
                return new CategoricalHyperparameter(hp.name, [hp.value])
            else
                return NumericalHyperparameter.fromJSON(hp as NumericalHyperparameter)
        }
    }

    export class CategoricalHyperparameter extends HyperParameter {
        constructor(public readonly name: string,
                    public readonly choices: ConfigValue[]) {
            super(name, []);
        }

        static fromJSON(hp: any): CategoricalHyperparameter {
            return new CategoricalHyperparameter(hp.name, hp.choices)
        }
    }

    export class NumericalHyperparameter extends HyperParameter {
        constructor(public readonly name: string,
                    public readonly lower: number,
                    public readonly upper: number,
                    public readonly log: boolean) {
            super(name, []);
        }

        static fromJSON(hp: any): NumericalHyperparameter {
            return new NumericalHyperparameter(hp.name, hp.lower, hp.upper, hp.log)
        }
    }

    export class Explanation {

        constructor(public readonly performances: Map<string, [number, number][]>) {
        }

        get(id: string): [number, number][] | undefined {
            return this.performances.get(id)
        }
    }

    export type Explanations = Map<CandidateId, Config.Explanation>
}


export namespace RF {
    export class StateDetails {

        constructor(public readonly failure_message: string,
                    public readonly visits: number,
                    public readonly score: number,
                    public readonly selected: boolean,
                    public readonly policy: PolicyData) {
        }

        static fromJson(stateDetails: StateDetails): StateDetails {
            return new StateDetails(stateDetails.failure_message,
                stateDetails.visits,
                stateDetails.score,
                stateDetails.selected,
                new Map<string, number>(Object.entries(stateDetails.policy)));
        }

        isUnvisited(): boolean {
            return this.failure_message === 'Unvisited'
        }

        isFailure(): boolean {
            return !!this.failure_message && !this.isUnvisited()
        }
    }

    export class PolicyExplanations {
        constructor(public readonly id: string,
                    public readonly label: string,
                    public readonly details: Map<string, StateDetails>,
                    public readonly children?: PolicyExplanations[]) {
        }

        static fromJson(graphNode: PolicyExplanations): PolicyExplanations {
            if (Object.keys(graphNode).length === 0)
                return undefined

            const details: Map<string, StateDetails> = new Map<string, StateDetails>();
            Object.entries<StateDetails>(graphNode.details as {})
                .forEach(k => details.set(k[0], StateDetails.fromJson(k[1])));

            return new PolicyExplanations(graphNode.id,
                graphNode.label,
                details,
                graphNode.children?.map(d => PolicyExplanations.fromJson(d)))
        }

        getDetails(key: string): StateDetails {
            return this.details.get(key)
        }

        shouldDisplay(key: string) {
            return this.details.has(key);
        }
    }

}

export class Explanations {
    constructor(public readonly structures: RF.PolicyExplanations,
                public readonly configs: Config.Explanations) {
    }

    static fromJson(xai: Explanations) {
        // TODO load real structure explanations once available
        const configs = new Map<CandidateId, Config.Explanation>()

        return new Explanations(RF.PolicyExplanations.fromJson(xai.structures), configs)
    }
}

export class Runtime {
    constructor(public readonly training_time: number, public readonly timestamp: number) {
    }

    public static fromJson(runtime: Runtime): Runtime {
        return new Runtime(runtime.training_time, runtime.timestamp)
    }
}

export class Candidate {

    public static readonly SUCCESS = 'SUCCESS'

    constructor(public readonly id: CandidateId,
                public readonly status: string,
                public readonly budget: number,
                public readonly loss: number,
                public readonly runtime: Runtime,
                public readonly config: Config) {
    }

    public static fromJson(candidate: Candidate): Candidate {
        const config = new Map<string, number | string>();
        Object.entries<string | number>(candidate.config as {})
            .forEach(k => config.set(k[0], k[1]));

        return new Candidate(candidate.id, candidate.status, candidate.budget, candidate.loss, Runtime.fromJson(candidate.runtime), config)
    }

    subConfig(step: PipelineStep): Config {
        const subConfig = new Map<string, ConfigValue>()
        Array.from(this.config.keys())
            .filter(k => k.split(':').filter(t => t === step.id).length > 0)
            .forEach(key => {
                const tokens = key.split(':')
                subConfig.set(tokens[tokens.length - 1], this.config.get(key))
            })
        return subConfig
    }
}

export class MetaInformation {
    constructor(public readonly framework: string,
                public readonly start_time: number,
                public readonly end_time: number,
                public readonly metric: string,
                public readonly is_minimization: boolean,
                public readonly openml_task: number,
                public readonly openml_fold: number,
                public readonly n_structures: number,
                public readonly n_configs: number,
                public readonly iterations: {},
                public readonly model_dir: string,
                public readonly data_file: string,
                public readonly bestPerformance: number,
                public readonly worstPerformance: number,
                public readonly config: Map<string, ConfigValue>) {
    }

    static fromJson(meta: MetaInformation, losses: number[]): MetaInformation {
        const bestPerformance = meta.is_minimization ? Math.min(...losses) : Math.max(...losses)
        const worstPerformance = meta.is_minimization ? Math.max(...losses) : Math.min(...losses)

        return new MetaInformation('dswizard', meta.start_time, meta.end_time, meta.metric, meta.is_minimization,
            meta.openml_task, meta.openml_fold, meta.n_structures, meta.n_configs, meta.iterations, meta.model_dir,
            meta.data_file, bestPerformance, worstPerformance, new Map<string, ConfigValue>(Object.entries(meta.config)))
    }
}

export class PipelineStep {

    public readonly label: string
    public readonly edgeLabels: Map<string, string>

    constructor(public readonly id: string, public readonly clazz: string, public readonly parentIds: string[]) {
        this.label = normalizeComponent(this.clazz)
        this.edgeLabels = new Map<string, string>()
    }
}

export class Pipeline {

    constructor(public readonly steps: PipelineStep[]) {
    }

    static fromJson(pipeline: any): Pipeline {
        const [steps] = this.loadSingleStep('', pipeline, [])
        return new Pipeline(steps)
    }


    private static loadSingleStep(id: string, step: any, parents: string[]): [PipelineStep[], string[]] {
        if (step.clazz.includes('Pipeline')) {
            let parents_: string[] = parents;
            const steps: PipelineStep[] = [];
            (step.args.steps as [string, any][])
                .forEach(([id, subStep]) => {
                        const res = this.loadSingleStep(id, subStep, parents_)
                        steps.push(...res[0])
                        parents_ = res[1]
                    }
                )
            return [steps, parents_]
        } else if (step.clazz.includes('ColumnTransformer')) {
            const steps: PipelineStep[] = [];
            const outParents: string[] = [];
            (step.args.transformers as [string, any, any][])
                .forEach(([id, subPath, columns]) => {
                    const [childSteps, newParents] = this.loadSingleStep(id, subPath, parents)
                    childSteps[0].edgeLabels.set(id, columns.toString()) // At least one child always have to be present
                    steps.push(...childSteps)
                    outParents.push(...newParents)
                })
            return [steps, outParents]
        } else if (step.clazz.includes('FeatureUnion')) {
            const steps: PipelineStep[] = [];
            const outParents: string[] = [];
            (step.args.transformer_list as [string, any][])
                .forEach(([id, subPath]) => {
                    const [childSteps, newParents] = this.loadSingleStep(id, subPath, parents)
                    childSteps[0].edgeLabels.set(id, 'all') // At least one child always have to be present
                    steps.push(...childSteps)
                    outParents.push(...newParents)
                })
            return [steps, outParents]
        } else {
            return [[new PipelineStep(id, step.clazz, parents)], [id]]
        }
    }
}

export class Structure {

    constructor(public readonly cid: CandidateId,
                public readonly pipeline: Pipeline,
                public readonly configspace: Config.ConfigSpace,
                public readonly configs: Candidate[]) {
    }

    static fromJson(structure: Structure): Structure {
        // raw pipeline data is list of tuple and not object
        const pipeline = Pipeline.fromJson(structure.pipeline as any)
        const configs = structure.configs.map(c => Candidate.fromJson(c))
        const configSpace = Config.ConfigSpace.fromJson(structure.configspace as any)
        return new Structure(structure.cid, pipeline, configSpace, configs)
    }
}

export class Runhistory {

    constructor(public readonly meta: MetaInformation,
                public readonly structures: Structure[],
                public readonly explanations: Explanations) {
    }

    static fromJson(runhistory: Runhistory): Runhistory {
        const structures = runhistory.structures.map(s => Structure.fromJson(s))
        const losses = [].concat(...structures.map(s => s.configs.map(c => c.loss)))

        return new Runhistory(MetaInformation.fromJson(runhistory.meta, losses),
            structures,
            Explanations.fromJson(runhistory.explanations))
    }
}
