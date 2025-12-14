from setuptools import setup, find_packages

setup(
    name="tefas-api",
    version="1.0.0",
    packages=find_packages(),
    install_requires=["playwright>=1.40.0"],
    python_requires=">=3.10",
)
