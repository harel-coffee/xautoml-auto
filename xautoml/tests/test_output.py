from xautoml.output import OutputCalculator, RAW
from xautoml.tests import get_168746, get_autosklearn


def test_outputs():
    main = get_168746()
    X, y, pipeline = main.get_pipeline('00:00:00')

    df_handler = OutputCalculator()
    inputs, outputs = df_handler.calculate_outputs(pipeline, X, y, method=RAW)

    print(outputs)


def test_outputs_auto_sklearn():
    main = get_autosklearn()
    X, y, pipeline = main.get_pipeline('00:00:02')

    df_handler = OutputCalculator()
    inputs, outputs = df_handler.calculate_outputs(pipeline, X, y, method=RAW)

    print(outputs)
