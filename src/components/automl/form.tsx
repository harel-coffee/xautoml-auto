import {
    Box,
    Button,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    TextareaAutosize,
    TextField
} from "@material-ui/core";
import React from "react";
import {FileDialog, IFileBrowserFactory} from "@jupyterlab/filebrowser";
import {KernelWrapper} from "../../jupyter";
import {CollapseComp} from "../../util/collapse";

interface InputFormProps {
    fileBrowserFactory: IFileBrowserFactory
    kernel: KernelWrapper
    submitDisabled: boolean
    onSubmit: (formValues: FormValues) => void
    onFileSelection?: (path: string) => void
}

export interface FormValues {
    timeout: number
    runtime: number
    optimizer: string
    metric: string
    config: string
    inputFile: string
    target: string
}

interface InputFormState {
    formValues: FormValues
    target_columns: string[]
    configValid: boolean
    formValid: boolean
}

export class InputForm extends React.Component<InputFormProps, InputFormState> {

    constructor(props: any) {
        super(props);

        this.state = {
            formValues: {
                timeout: 10,
                runtime: 10,
                optimizer: "dswizard",
                metric: "accuracy",
                config: "{}",
                inputFile: "",
                target: ""
            },
            target_columns: undefined,
            configValid: true,
            formValid: false
        }

        this.handleInputChange = this.handleInputChange.bind(this)
        this.selectFile = this.selectFile.bind(this)
        this.validateConfig = this.validateConfig.bind(this)
    }

    private static formValid(formValues: FormValues, configValid: boolean): boolean {
        return formValues.inputFile !== "" && formValues.target !== "" && configValid
    }


    private handleInputChange(e: React.ChangeEvent<{ name?: string; value: unknown }>) {
        const {name, value} = e.target;
        this.setState(state => {
            const formValues = {...state.formValues, [name]: value}
            this.setState(
                {formValues: formValues, formValid: InputForm.formValid(formValues, this.state.configValid)}
            )
        })
    }

    private async selectFile() {
        const fileBrowser = this.props.fileBrowserFactory.createFileBrowser('dswizard-classification');
        const fileDialog = FileDialog.getOpenFiles({
            manager: fileBrowser.model.manager,
            filter: value => {
                return value.mimetype === 'text/csv'
            },
            title: 'Select'
        });

        const result = await fileDialog;
        if (result.button.accept) {
            const selectedFiles: string[] = result.value.map(el => el.path);
            const file = selectedFiles[0]

            const formValues = {...this.state.formValues, ['inputFile']: file}
            this.setState({
                formValues: formValues,
                formValid: InputForm.formValid(formValues, this.state.configValid)
            })
            this.props.kernel.executeCode<string[]>(
                `
from xautoml.gui import get_columns
get_columns('${file}')
                `
            ).then(columns => this.setState({target_columns: columns}))

            if (this.props.onFileSelection)
                this.props.onFileSelection(file)
        }
    }

    private validateConfig(e: React.ChangeEvent<{ name?: string; value: unknown }>) {
        this.props.kernel.executeCode<boolean[]>(`
from xautoml.gui import validate_configuration
validate_configuration('''${e.target.value}''')
        `).then(valid => {
            this.setState({
                configValid: valid[0],
                formValid: InputForm.formValid(this.state.formValues, valid[0])
            })
        })
        this.handleInputChange(e)
    }

    render() {
        const {formValues} = this.state

        return (
            <div className={'lm-Widget p-Widget '}>
                <Box sx={{flexGrow: 1}}>
                    <Grid container direction="column" alignContent={"center"} spacing={2}>
                        <Grid item>
                            <h1>AutoML Classification</h1>
                        </Grid>

                        <hr style={{minWidth: '80%'}}/>
                        <Grid item>
                            <h2>Data Set</h2>
                        </Grid>
                        <Grid item>
                            <FormControl>
                                <FormLabel>Data Set</FormLabel>

                                <Grid container direction="row" justifyContent={"space-between"}
                                      alignContent={"center"}
                                      spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            id="input-file"
                                            name="inputFile"
                                            type="text"
                                            value={formValues.inputFile}
                                            onChange={this.handleInputChange}
                                        />
                                    </Grid>

                                    <Grid item xs={6}>
                                        <Button variant="contained" color="primary"
                                                onClick={this.selectFile}>
                                            Select
                                        </Button>
                                    </Grid>
                                </Grid>
                            </FormControl>
                        </Grid>

                        {this.state.target_columns !== undefined && <Grid item>
                            <FormControl>
                                <FormLabel>Target Column</FormLabel>
                                <Select
                                    name="target"
                                    value={formValues.target}
                                    onChange={this.handleInputChange}
                                >
                                    {this.state.target_columns.map(c => <MenuItem key={c}
                                                                                  value={c}>{c}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>}

                        <hr style={{minWidth: '80%'}}/>
                        <CollapseComp showInitial={false} help={
                            'Provide additional configuration to fine-tune the optimization procedure'}>
                            <h2>Optimizer Configuration</h2>

                            <Grid container direction="column" spacing={2}>
                                <Grid item>
                                    <FormControl>
                                        <FormLabel>Optimizer</FormLabel>
                                        <RadioGroup
                                            name="optimizer"
                                            value={formValues.optimizer}
                                            onChange={this.handleInputChange}
                                            row
                                        >
                                            <FormControlLabel
                                                key="dswizard"
                                                value="dswizard"
                                                control={<Radio size="small"/>}
                                                label="dswizard"
                                            />
                                            <FormControlLabel
                                                key="auto-sklearn"
                                                value="auto-sklearn"
                                                control={<Radio size="small"/>}
                                                label="auto-sklearn"
                                            />
                                            <FormControlLabel
                                                key="tpot"
                                                value="tpot"
                                                control={<Radio size="small"/>}
                                                label="tpot"
                                            />
                                        </RadioGroup>
                                    </FormControl>
                                </Grid>

                                <Grid item>
                                    <FormControl>
                                        <FormLabel>Optimization Duration</FormLabel>
                                        <TextField
                                            id="runtime"
                                            name="runtime"
                                            type="number"
                                            label={'seconds'}
                                            value={formValues.runtime}
                                            onChange={this.handleInputChange}
                                        />
                                    </FormControl>
                                </Grid>

                                <Grid item>
                                    <FormControl>
                                        <FormLabel>Evaluation Timeout</FormLabel>
                                        <TextField
                                            id="timeout"
                                            name="timeout"
                                            type="number"
                                            label={'seconds'}
                                            value={formValues.timeout}
                                            onChange={this.handleInputChange}
                                        />
                                    </FormControl>
                                </Grid>

                                <Grid item>
                                    <FormControl>
                                        <FormLabel>Cost Metric</FormLabel>
                                        <Select
                                            name="metric"
                                            value={formValues.metric}
                                            onChange={this.handleInputChange}
                                        >
                                            <MenuItem key="accuracy" value="accuracy">Accuracy</MenuItem>
                                            <MenuItem key="roc_auc" value="roc_auc">ROC AUC</MenuItem>
                                            <MenuItem key="f1 " value="f1">f1</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item>
                                    <FormControl>
                                        <FormLabel>Additional Configuration</FormLabel>
                                        <TextareaAutosize
                                            name="config"
                                            cols={40}
                                            minRows={5}
                                            value={formValues.config}
                                            onChange={this.validateConfig}
                                        />
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </CollapseComp>

                        <hr style={{minWidth: '80%'}}/>
                        <Grid item>
                            <Button variant="contained" color="primary"
                                    disabled={!this.state.formValid || this.props.submitDisabled}
                                    onClick={(e) => {
                                        this.props.onSubmit(this.state.formValues)
                                        e.stopPropagation()
                                        e.preventDefault()
                                    }}>
                                Submit
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </div>
        )
    }
}
