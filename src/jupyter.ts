import {
    CancelablePromise, ConfigSimilarityResponse,
    ConfusionMatrixData, DecisionTreeResult, FANOVAResponse, FeatureImportance, LimeResult,
    OutputDescriptionData, requestConfigSimilarity,
    requestConfusionMatrix, requestFANOVA, requestFeatureImportance, requestGlobalSurrogate,
    requestLimeApproximation,
    requestOutputComplete,
    requestOutputDescription, requestSimulatedSurrogate
} from "./handler";
import {INotebookTracker, Notebook, NotebookActions} from "@jupyterlab/notebook";
import {TagTool} from "@jupyterlab/celltags";
import {Config} from "./model";

export class Jupyter {

    private readonly LOCAL_STORAGE_CONTENT = 'xautoml-previousCellContent'
    private readonly TAG_NAME = 'xautoml-generated'
    private previousCellContent: string = undefined;

    constructor(private notebooks: INotebookTracker, private tags: TagTool) {
        this.previousCellContent = localStorage.getItem(this.LOCAL_STORAGE_CONTENT)
    }

    createCell(content: string = ''): void {
        const current = this.notebooks.currentWidget
        const notebook: Notebook = current.content
        const xautomlCell = notebook.activeCellIndex

        NotebookActions.selectBelow(notebook)
        const currentContent = notebook.activeCell.model.value.text
        if (this.tags.checkApplied(this.TAG_NAME) && currentContent === this.previousCellContent) {
            // Cell was autogenerated and not changed by user.
            NotebookActions.clearOutputs(notebook)
        } else {
            notebook.activeCellIndex = xautomlCell;
            notebook.deselectAll();
            NotebookActions.insertBelow(notebook)
            this.tags.addTag(this.TAG_NAME)
        }

        notebook.activeCell.model.value.text = content
        this.previousCellContent = content
        localStorage.setItem(this.LOCAL_STORAGE_CONTENT, content)

        notebook.activeCell.editor.focus()
    }

    requestConfusionMatrix(model_file: string, data_file: string): Promise<ConfusionMatrixData> {
        return requestConfusionMatrix(model_file, data_file)
    }

    requestOutputComplete(model_file: string, data_file: string): Promise<OutputDescriptionData> {
        return requestOutputComplete(model_file, data_file)
    }

    requestOutputDescription(model_file: string, data_file: string): Promise<OutputDescriptionData> {
        return requestOutputDescription(model_file, data_file)
    }

    requestLimeApproximation(model_file: string, idx: number, data_file: string, step: string): CancelablePromise<LimeResult> {
        return requestLimeApproximation(model_file, idx, data_file, step)
    }

    requestGlobalSurrogate(model_file: string, data_file: string, step: string, max_leaf_nodes: number = undefined): CancelablePromise<DecisionTreeResult> {
        return requestGlobalSurrogate(model_file, data_file, step, max_leaf_nodes)
    }

    requestFeatureImportance(model_file: string, data_file: string, step: string): CancelablePromise<FeatureImportance> {
        return requestFeatureImportance(model_file, data_file, step)
    }

    requestFANOVA(cs: Config.ConfigSpace, configs: Config[], loss: number[], step?: string): Promise<FANOVAResponse> {
        return requestFANOVA(cs, configs, loss, step)
    }

    requestSimulatedSurrogate(cs: Config.ConfigSpace, configs: Config[], loss: number[]): Promise<Config.Explanation> {
        return requestSimulatedSurrogate(cs, configs, loss)
    }

    requestConfigSimilarity(cs: Config.ConfigSpace[], configs: any[][], loss: number[], is_minimization: boolean): Promise<ConfigSimilarityResponse> {
        return requestConfigSimilarity(cs, configs, loss, is_minimization)
    }
}

// Prefix used in python to prevent accidental name clashes
export const ID = 'xautoml'
