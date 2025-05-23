import scipy.io
import json
import numpy as np

# Función para convertir cualquier numpy.ndarray a valores simples
def convert_ndarray(val):
    if isinstance(val, np.ndarray):
        # Si es un array con un solo valor, toma el valor como tipo básico
        if val.size == 1:
            return val.item()  # Extrae el valor único
        else:
            return val.tolist()  # Si tiene varios elementos, convierte a lista
    return val

# Cargar archivos .mat
variables = scipy.io.loadmat("OSWT1s_names.mat")
datos = scipy.io.loadmat("OSWT1s_vars.mat")

# Extraer los nombres de las variables y los datos
# Asegurarse de que las claves son strings y no arrays
var_names = list(variables.values())[3].flatten().tolist()
data_values = list(datos.values())[3]

# Verificar si las claves son arrays y convertirlas a simples strings
var_names = [convert_ndarray(name) for name in var_names]

# Convertir los datos, asegurando que todo sea un valor simple o lista
json_data = [
    dict(zip(var_names, [convert_ndarray(item) for item in row]))
    for row in data_values
]

# Guardar en un archivo JSON
with open("datos.json", "w") as json_file:
    json.dump(json_data, json_file, indent=4)

print("Conversión completada: datos.json")
